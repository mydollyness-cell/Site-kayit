var express = require('express');
var fs = require('fs');
var initSqlJs = require('sql.js/dist/sql-asm.js');
var app = express();
app.use(express.json());
app.use(express.static('./public'));
var db;
function saveDb() {
  fs.writeFileSync('./site.db', Buffer.from(db.export()));
}
app.post('/api/register', function (req, res) {
  var block = req.body.block;
  var apartmentNo = req.body.apartmentNo;
  var residentType = req.body.residentType;
  var nameSurname = req.body.nameSurname;
  if (!block || !apartmentNo || !residentType || !nameSurname) {
    return res.status(400).json({ success: false, message: 'Tum alanlar zorunludur.' });
  }
  var validBlocks = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  if (validBlocks.indexOf(block) === -1) {
    return res.status(400).json({ success: false, message: 'Gecersiz blok secimi.' });
  }
  var aptNo = parseInt(apartmentNo, 10);
  if (isNaN(aptNo) || aptNo < 1) {
    return res.status(400).json({ success: false, message: 'Gecersiz daire numarasi.' });
  }
  var validTypes = ['Ev Sahibi', 'Kiraci'];
  if (validTypes.indexOf(residentType) === -1) {
    return res.status(400).json({ success: false, message: 'Gecersiz oturum turu.' });
  }
  if (nameSurname.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Ad soyad en az 3 karakter olmalidir.' });
  }
  try {
    var s = db.prepare('SELECT id FROM registrations WHERE block=? AND apartment_no=? AND resident_type=?');
    s.bind([block, aptNo, residentType]);
    var exists = s.step();
    s.free();
    if (exists) {
      return res.status(409).json({ success: false, message: 'Bu kayit zaten mevcut.' });
    }
    db.run('INSERT INTO registrations (block,apartment_no,resident_type,name_surname) VALUES (?,?,?,?)', [block, aptNo, residentType, nameSurname.trim()]);
    saveDb();
    return res.json({ success: true, message: 'Kayit basarili! ' + block + ' Blok Daire ' + aptNo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});
console.log('Starting...');
initSqlJs().then(function (SQL) {
  if (fs.existsSync('./site.db')) {
    db = new SQL.Database(fs.readFileSync('./site.db'));
  } else {
    db = new SQL.Database();
  }
  db.run('CREATE TABLE IF NOT EXISTS registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, block TEXT NOT NULL, apartment_no INTEGER NOT NULL, resident_type TEXT NOT NULL, name_surname TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(block, apartment_no, resident_type))');
  saveDb();
  app.listen(3000, function () {
    console.log('http://localhost:3000');
  });
}).catch(function (err) {
  console.error('FAIL:', err);
});
