var express = require('express');
var path = require('path');
var { neon } = require('@neondatabase/serverless');

var dbUrl = process.env.DATABASE_URL || '';
// Remove channel_binding parameter if present (incompatible with Neon serverless driver)
dbUrl = dbUrl.replace(/[&?]channel_binding=[^&]*/g, '');
var sql = neon(dbUrl);
var app = express();
var PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

  sql.query('SELECT id FROM "Registration" WHERE block=$1 AND apartment_no=$2 AND resident_type=$3', [block, aptNo, residentType])
    .then(function (rows) {
      if (rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: block + ' Blok, Daire ' + aptNo + ' icin "' + residentType + '" kaydi zaten mevcut.'
        });
      }
      return sql.query('INSERT INTO "Registration" (block, apartment_no, resident_type, name_surname) VALUES ($1,$2,$3,$4)', [block, aptNo, residentType, nameSurname.trim()])
        .then(function () {
          return res.json({
            success: true,
            message: 'Kayit basarili! ' + block + ' Blok, Daire ' + aptNo + ' - ' + residentType + ' olarak kaydedildi.'
          });
        });
    })
    .catch(function (err) {
      console.error('Register error:', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
    });
});

app.get('/api/registrations', function (req, res) {
  sql.query('SELECT id, block, apartment_no, resident_type, created_at FROM "Registration" ORDER BY block ASC, apartment_no ASC')
    .then(function (rows) {
      return res.json({ success: true, data: rows, total: rows.length });
    })
    .catch(function (err) {
      console.error('List error:', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
    });
});

app.get('/api/export-excel', function (req, res) {
  var block = req.query.block || '';
  var query = block
    ? sql.query('SELECT * FROM "Registration" WHERE block=$1 ORDER BY block ASC, apartment_no ASC', [block])
    : sql.query('SELECT * FROM "Registration" ORDER BY block ASC, apartment_no ASC');
  query.then(function (rows) {
    var BOM = '\uFEFF';
    var csv = BOM;
    csv += '#;Blok;Daire No;Oturum Sekli;Kayit Tarihi\n';
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var dt = new Date(row.created_at);
      var dateStr = ('0' + dt.getDate()).slice(-2) + '.' + ('0' + (dt.getMonth() + 1)).slice(-2) + '.' + dt.getFullYear();
      csv += (j + 1) + ';' + row.block + ';' + row.apartment_no + ';' + row.resident_type + ';' + dateStr + '\n';
    }
    var filename = block ? 'kayitlar_' + block + '_blok.csv' : 'kayitlar_tumu.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    return res.send(csv);
  }).catch(function (err) {
    console.error('Export error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  });
});

app.delete('/api/register/:id', function (req, res) {
  var id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz kayit ID.' });
  }
  sql.query('DELETE FROM "Registration" WHERE id=$1', [id])
    .then(function () {
      return res.json({ success: true, message: 'Kayit silindi.' });
    })
    .catch(function (err) {
      console.error('Delete error:', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
    });
});

app.get('/api/check', function (req, res) {
  var block = req.query.block;
  var apartmentNo = req.query.apartmentNo;
  var residentType = req.query.residentType;

  if (!block || !apartmentNo || !residentType) {
    return res.status(400).json({ success: false, message: 'Parametreler eksik.' });
  }

  var aptNo = parseInt(apartmentNo, 10);
  sql.query('SELECT id FROM "Registration" WHERE block=$1 AND apartment_no=$2 AND resident_type=$3', [block, aptNo, residentType])
    .then(function (rows) {
      return res.json({ exists: rows.length > 0 });
    })
    .catch(function (err) {
      console.error('Check error:', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
    });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, function () {
    console.log('Server is running at http://localhost:' + PORT);
  });
}

module.exports = app;
