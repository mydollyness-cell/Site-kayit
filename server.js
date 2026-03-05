var express = require('express');
var path = require('path');
var { PrismaClient } = require('@prisma/client');

var prisma = new PrismaClient();
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

  prisma.registration.findFirst({
    where: { block: block, apartment_no: aptNo, resident_type: residentType }
  }).then(function (existing) {
    if (existing) {
      return res.status(409).json({
        success: false,
        message: block + ' Blok, Daire ' + aptNo + ' icin "' + residentType + '" kaydi zaten mevcut.'
      });
    }
    return prisma.registration.create({
      data: {
        block: block,
        apartment_no: aptNo,
        resident_type: residentType,
        name_surname: nameSurname.trim()
      }
    }).then(function () {
      return res.json({
        success: true,
        message: 'Kayit basarili! ' + block + ' Blok, Daire ' + aptNo + ' - ' + residentType + ' olarak kaydedildi.'
      });
    });
  }).catch(function (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  });
});

app.get('/api/registrations', function (req, res) {
  prisma.registration.findMany({
    orderBy: [{ block: 'asc' }, { apartment_no: 'asc' }]
  }).then(function (rows) {
    var result = rows.map(function (r) {
      return {
        id: r.id,
        block: r.block,
        apartment_no: r.apartment_no,
        resident_type: r.resident_type,
        created_at: r.created_at
      };
    });
    return res.json({ success: true, data: result, total: result.length });
  }).catch(function (err) {
    console.error('List error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  });
});

app.get('/api/export-excel', function (req, res) {
  var block = req.query.block || '';
  var where = {};
  if (block) { where.block = block; }

  prisma.registration.findMany({
    where: where,
    orderBy: [{ block: 'asc' }, { apartment_no: 'asc' }]
  }).then(function (rows) {
    var BOM = '\uFEFF';
    var csv = BOM;
    csv += '#;Blok;Daire No;Oturum Sekli;Ad Soyad;Kayit Tarihi\n';
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var dt = new Date(row.created_at);
      var dateStr = ('0' + dt.getDate()).slice(-2) + '.' + ('0' + (dt.getMonth() + 1)).slice(-2) + '.' + dt.getFullYear();
      csv += (j + 1) + ';' + row.block + ';' + row.apartment_no + ';' + row.resident_type + ';' + row.name_surname + ';' + dateStr + '\n';
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

app.get('/api/check', function (req, res) {
  var block = req.query.block;
  var apartmentNo = req.query.apartmentNo;
  var residentType = req.query.residentType;

  if (!block || !apartmentNo || !residentType) {
    return res.status(400).json({ success: false, message: 'Parametreler eksik.' });
  }

  var aptNo = parseInt(apartmentNo, 10);
  prisma.registration.findFirst({
    where: { block: block, apartment_no: aptNo, resident_type: residentType }
  }).then(function (row) {
    return res.json({ exists: !!row });
  }).catch(function (err) {
    console.error('Check error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  });
});

app.listen(PORT, function () {
  console.log('Server is running at http://localhost:' + PORT);
});
