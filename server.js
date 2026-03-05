var express = require('express');
var path = require('path');
var fs = require('fs');

var app = express();
var PORT = 3000;
var DB_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      var raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Data load error:', e);
  }
  return [];
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

var registrations = loadData();

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

  var validTypes = ['Ev Sahibi', 'Kiraci', 'Kiracı'];
  if (validTypes.indexOf(residentType) === -1) {
    return res.status(400).json({ success: false, message: 'Gecersiz oturum turu.' });
  }

  if (nameSurname.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Ad soyad en az 3 karakter olmalidir.' });
  }

  var duplicate = false;
  for (var i = 0; i < registrations.length; i++) {
    var r = registrations[i];
    if (r.block === block && r.apartment_no === aptNo && r.resident_type === residentType) {
      duplicate = true;
      break;
    }
  }

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: block + ' Blok, Daire ' + aptNo + ' icin "' + residentType + '" kaydi zaten mevcut.'
    });
  }

  registrations.push({
    id: registrations.length + 1,
    block: block,
    apartment_no: aptNo,
    resident_type: residentType,
    name_surname: nameSurname.trim(),
    created_at: new Date().toISOString()
  });

  saveData(registrations);

  return res.json({
    success: true,
    message: 'Kayit basarili! ' + block + ' Blok, Daire ' + aptNo + ' - ' + residentType + ' olarak kaydedildi.'
  });
});

app.get('/api/registrations', function (req, res) {
  var result = [];
  for (var i = 0; i < registrations.length; i++) {
    var r = registrations[i];
    result.push({
      id: r.id,
      block: r.block,
      apartment_no: r.apartment_no,
      resident_type: r.resident_type,
      created_at: r.created_at
    });
  }

  // Sort by block then apartment number
  result.sort(function (a, b) {
    if (a.block < b.block) return -1;
    if (a.block > b.block) return 1;
    return a.apartment_no - b.apartment_no;
  });
  return res.json({ success: true, data: result, total: result.length });
});

app.get('/api/export-excel', function (req, res) {
  var block = req.query.block || '';
  var result = [];
  for (var i = 0; i < registrations.length; i++) {
    var r = registrations[i];
    if (!block || r.block === block) {
      result.push(r);
    }
  }
  result.sort(function (a, b) {
    if (a.block < b.block) return -1;
    if (a.block > b.block) return 1;
    return a.apartment_no - b.apartment_no;
  });

  // BOM for UTF-8 Excel compatibility
  var BOM = '\uFEFF';
  var csv = BOM;
  csv += '#;Blok;Daire No;Oturum Sekli;Kayit Tarihi\n';
  for (var j = 0; j < result.length; j++) {
    var row = result[j];
    var dt = new Date(row.created_at);
    var dateStr = ('0' + dt.getDate()).slice(-2) + '.' + ('0' + (dt.getMonth() + 1)).slice(-2) + '.' + dt.getFullYear();
    csv += (j + 1) + ';' + row.block + ';' + row.apartment_no + ';' + row.resident_type + ';' + dateStr + '\n';
  }

  var filename = block ? 'kayitlar_' + block + '_blok.csv' : 'kayitlar_tumu.csv';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  return res.send(csv);
});

app.get('/api/check', function (req, res) {
  var block = req.query.block;
  var apartmentNo = req.query.apartmentNo;
  var residentType = req.query.residentType;

  if (!block || !apartmentNo || !residentType) {
    return res.status(400).json({ success: false, message: 'Parametreler eksik.' });
  }

  var aptNo = parseInt(apartmentNo, 10);
  var exists = false;
  for (var i = 0; i < registrations.length; i++) {
    var r = registrations[i];
    if (r.block === block && r.apartment_no === aptNo && r.resident_type === residentType) {
      exists = true;
      break;
    }
  }

  return res.json({ exists: exists });
});

app.listen(PORT, function () {
  console.log('Server is running at http://localhost:' + PORT);
});
