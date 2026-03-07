var express = require('express');
var path = require('path');
var fs = require('fs');
var { neon } = require('@neondatabase/serverless');

// Load .env file manually (no dotenv dependency needed)
var envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  var envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(function (line) {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    var eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;
    var key = line.substring(0, eqIndex).trim();
    var val = line.substring(eqIndex + 1).trim();
    if (!process.env[key]) { process.env[key] = val; }
  });
}

var dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('HATA: DATABASE_URL ortam degiskeni ayarlanmamis.');
  console.error('.env dosyasina Neon PostgreSQL baglanti adresinizi ekleyin:');
  console.error('  DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require');
  process.exit(1);
}
// Remove channel_binding parameter if present (incompatible with Neon serverless driver)
dbUrl = dbUrl.replace(/[&?]channel_binding=[^&]*/g, '');
var sql = neon(dbUrl);
var app = express();

sql`CREATE TABLE IF NOT EXISTS "Registration" ("id" SERIAL NOT NULL, "block" TEXT NOT NULL, "apartment_no" INTEGER NOT NULL, "resident_type" TEXT NOT NULL, "name_surname" TEXT NOT NULL, "phone_number" TEXT NOT NULL DEFAULT '', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Registration_pkey" PRIMARY KEY ("id"))`.then(function(){console.log("Table ensured OK")}).catch(function(e){console.error("Table init err:",e.message)});


sql`CREATE TABLE IF NOT EXISTS "Registration" ("id" SERIAL NOT NULL,"block" TEXT NOT NULL,"apartment_no" INTEGER NOT NULL,"resident_type" TEXT NOT NULL,"name_surname" TEXT NOT NULL,"phone_number" TEXT NOT NULL DEFAULT '',"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Registration_pkey" PRIMARY KEY ("id"))`.then(function(){console.log("Table ensured OK");return sql`ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "phone_number" TEXT NOT NULL DEFAULT ''`}).then(function(){console.log("phone_number column OK")}).catch(function(e){console.error("Table init error:",e.message)});
var PORT = process.env.PORT || 3000;

// Auto-generate index.html on startup
(function generateIndexHtml() {
  var publicDir = path.join(__dirname, 'public');
  var indexPath = path.join(publicDir, 'index.html');
  var h = '<!DOCTYPE html>\n<html lang="tr">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Site Kayit Sistemi</title>\n<style>\n';
  h += '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n';
  h += "body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}\n";
  h += '.container{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.15);padding:40px 36px;width:100%;max-width:520px;animation:fadeIn .5s ease-out}\n';
  h += '@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}\n';
  h += 'header{text-align:center;margin-bottom:24px}\nheader h1{font-size:1.6rem;color:#2d3748;margin-bottom:6px}\n.subtitle{color:#718096;font-size:.95rem}\n';
  h += '.menu{display:flex;gap:8px;margin-bottom:28px;background:#f7fafc;border-radius:12px;padding:6px}\n';
  h += '.menu-btn{flex:1;padding:12px 16px;border:none;border-radius:10px;font-size:.95rem;font-weight:600;cursor:pointer;background:transparent;color:#718096;transition:all .25s ease}\n';
  h += '.menu-btn:hover{color:#4a5568;background:#edf2f7}\n';
  h += '.menu-btn.active{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;box-shadow:0 4px 12px rgba(102,126,234,.3)}\n';
  h += '.page{display:none}.page.active{display:block;animation:fadeIn .3s ease-out}\n';
  h += '.form-group{margin-bottom:20px}\n.form-group label{display:block;font-size:.9rem;font-weight:600;color:#4a5568;margin-bottom:6px}\n';
  h += ".form-group select,.form-group input{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:1rem;color:#2d3748;background:#f7fafc;transition:border-color .2s ease,box-shadow .2s ease;outline:none;-webkit-appearance:none;appearance:none}\n";
  h += ".form-group select{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a5568' d='M6 8L1 3h10z'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;cursor:pointer}\n";
  h += '.form-group select:focus,.form-group input:focus{border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.15);background:#fff}\n';
  h += '.form-group select.error,.form-group input.error{border-color:#e53e3e;box-shadow:0 0 0 3px rgba(229,62,62,.1)}\n';
  h += 'button[type="submit"]{width:100%;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-size:1.05rem;font-weight:600;border:none;border-radius:10px;cursor:pointer;transition:opacity .2s ease,transform .1s ease;margin-top:8px}\n';
  h += 'button[type="submit"]:hover{opacity:.92}button[type="submit"]:active{transform:scale(.98)}button[type="submit"]:disabled{opacity:.6;cursor:not-allowed}\n';
  h += '.message{margin-top:20px;padding:14px 18px;border-radius:10px;font-size:.95rem;text-align:center;line-height:1.5;animation:slideIn .3s ease-out}\n';
  h += '@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}\n';
  h += '.message.success{background:#f0fff4;color:#276749;border:1px solid #c6f6d5}\n';
  h += '.message.error{background:#fff5f5;color:#c53030;border:1px solid #fed7d7}\n';
  h += '.hidden{display:none}\n';
  h += '.list-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}\n';
  h += '.list-filter{display:flex;align-items:center;gap:8px}\n';
  h += '.list-filter label{font-size:.85rem;font-weight:600;color:#4a5568;white-space:nowrap}\n';
  h += ".list-filter select{padding:8px 32px 8px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:.9rem;color:#2d3748;background:#f7fafc;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a5568' d='M6 8L1 3h10z'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 10px center;transition:border-color .2s ease}\n";
  h += '.list-filter select:focus{border-color:#667eea}\n';
  h += '.total-count{font-size:.85rem;color:#718096;font-weight:600}\n.total-count span{color:#667eea;font-weight:700}\n';
  h += '.registrations-list{overflow-x:auto}\n';
  h += '.reg-table{width:100%;border-collapse:collapse;font-size:.88rem}\n';
  h += '.reg-table thead th{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:10px 12px;text-align:left;font-weight:600;font-size:.82rem;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}\n';
  h += '.reg-table thead th:first-child{border-radius:8px 0 0 0}.reg-table thead th:last-child{border-radius:0 8px 0 0}\n';
  h += '.reg-table tbody tr{transition:background .15s ease}.reg-table tbody tr:nth-child(even){background:#f7fafc}.reg-table tbody tr:hover{background:#edf2f7}\n';
  h += '.reg-table tbody td{padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#4a5568}\n';
  h += '.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.78rem;font-weight:600}\n';
  h += '.badge-owner{background:#ebf8ff;color:#2b6cb0}.badge-tenant{background:#fefcbf;color:#975a16}\n';
  h += '.empty-state{text-align:center;padding:40px 20px;color:#a0aec0}\n.empty-state .empty-icon{font-size:2.5rem;margin-bottom:12px}\n.empty-state p{font-size:.95rem}\n';
  h += '.loading-text{text-align:center;color:#a0aec0;padding:30px}\n';
  h += '.delete-btn{background:none;border:none;cursor:pointer;font-size:1.15rem;padding:4px 8px;border-radius:6px;transition:background .2s ease,transform .1s ease;opacity:.5}\n';
  h += '.delete-btn:hover{background:#fff5f5;opacity:1;transform:scale(1.15)}\n.delete-btn:active{transform:scale(.95)}\n';
  h += '.export-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:linear-gradient(135deg,#48bb78 0%,#38a169 100%);color:#fff;font-size:.85rem;font-weight:600;border:none;border-radius:8px;cursor:pointer;transition:opacity .2s ease,transform .1s ease;white-space:nowrap}\n';
  h += '.export-btn:hover{opacity:.9}.export-btn:active{transform:scale(.97)}\n';
  h += '.export-btn svg{width:16px;height:16px;fill:currentColor}\n';
  h += '@media(max-width:500px){.container{padding:28px 20px;border-radius:12px}header h1{font-size:1.35rem}.menu-btn{padding:10px 12px;font-size:.88rem}.form-group select,.form-group input{padding:11px 12px;font-size:.95rem}button[type="submit"]{padding:13px;font-size:1rem}.list-header{flex-direction:column;align-items:flex-start}.reg-table{font-size:.82rem}.reg-table thead th,.reg-table tbody td{padding:8px}}\n';
  h += '</style>\n</head>\n<body>\n';
  h += '<div class="container">\n<header>\n<h1>Site Kayit Sistemi</h1>\n<p class="subtitle">Daire sakinleri kayit formu</p>\n</header>\n';
  h += '<nav class="menu">\n<button class="menu-btn active" data-page="register">Kayit</button>\n<button class="menu-btn" data-page="list">Kayitlar</button>\n</nav>\n';
  h += '<section id="page-register" class="page active">\n<form id="registrationForm" novalidate>\n';
  h += '<div class="form-group"><label for="block">Blok Secimi</label><select id="block" required><option value="">-- Blok Seciniz --</option>';
  h += '<option value="A">A Blok</option><option value="B">B Blok</option><option value="C">C Blok</option>';
  h += '<option value="D">D Blok</option><option value="E">E Blok</option><option value="F">F Blok</option>';
  h += '<option value="G">G Blok</option></select></div>\n';
  h += '<div class="form-group"><label for="apartmentNo">Daire Numarasi</label><input type="number" id="apartmentNo" placeholder="Orn: 12" min="1" required></div>\n';
  h += '<div class="form-group"><label for="residentType">Oturum Sekli</label><select id="residentType" required><option value="">-- Seciniz --</option><option value="Ev Sahibi">Ev Sahibi</option><option value="Kiraci">Kiraci</option></select></div>\n';
  h += '<div class="form-group"><label for="nameSurname">Ad Soyad</label><input type="text" id="nameSurname" placeholder="Adiniz ve Soyadiniz" required></div>\n';
  h += '<div class="form-group"><label for="phoneNumber">Telefon Numarasi</label><input type="tel" id="phoneNumber" placeholder="05XXXXXXXXX" maxlength="11" required></div>\n';
  h += '<button type="submit" id="submitBtn"><span class="btn-text">Kayit Ol</span><span class="btn-loading hidden">Kaydediliyor...</span></button>\n';
  h += '</form>\n<div id="message" class="message hidden"></div>\n</section>\n';
  h += '<section id="page-list" class="page">\n<div class="list-header">\n';
  h += '<div class="list-filter"><label for="filterBlock">Blok Filtrele:</label><select id="filterBlock"><option value="">Tumu</option>';
  h += '<option value="A">A Blok</option><option value="B">B Blok</option><option value="C">C Blok</option>';
  h += '<option value="D">D Blok</option><option value="E">E Blok</option><option value="F">F Blok</option>';
  h += '<option value="G">G Blok</option></select></div>\n';
  h += '<p class="total-count">Toplam: <span id="totalCount">0</span> kayit</p>\n';
  h += '<button class="export-btn" id="exportBtn" title="Excel\'e Aktar"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-5-7l-3 3h2v3h2v-3h2l-3-3z"/></svg> Excel\'e Aktar</button>\n';
  h += '</div>\n<div id="registrationsList" class="registrations-list"><p class="loading-text">Yukleniyor...</p></div>\n</section>\n</div>\n';
  // Script
  h += '<script>\n';
  h += "document.addEventListener('DOMContentLoaded', function () {\n";
  h += "  var menuBtns = document.querySelectorAll('.menu-btn');\n  var pages = document.querySelectorAll('.page');\n";
  h += "  var form = document.getElementById('registrationForm');\n  var blockSelect = document.getElementById('block');\n";
  h += "  var apartmentInput = document.getElementById('apartmentNo');\n  var residentTypeSelect = document.getElementById('residentType');\n";
  h += "  var nameSurnameInput = document.getElementById('nameSurname');\n  var phoneNumberInput = document.getElementById('phoneNumber');\n";
  h += "  var submitBtn = document.getElementById('submitBtn');\n  var btnText = submitBtn.querySelector('.btn-text');\n";
  h += "  var btnLoading = submitBtn.querySelector('.btn-loading');\n  var messageDiv = document.getElementById('message');\n";
  h += "  var filterBlock = document.getElementById('filterBlock');\n  var totalCount = document.getElementById('totalCount');\n";
  h += "  var listContainer = document.getElementById('registrationsList');\n  var allRegistrations = [];\n";
  h += "  menuBtns.forEach(function (btn) {\n    btn.addEventListener('click', function () {\n";
  h += "      var t = btn.getAttribute('data-page');\n      menuBtns.forEach(function (b) { b.classList.remove('active'); });\n";
  h += "      btn.classList.add('active');\n      pages.forEach(function (p) { p.classList.remove('active'); });\n";
  h += "      document.getElementById('page-' + t).classList.add('active');\n      if (t === 'list') { loadRegistrations(); }\n    });\n  });\n";
  h += "  [blockSelect, apartmentInput, residentTypeSelect, nameSurnameInput, phoneNumberInput].forEach(function (el) {\n";
  h += "    el.addEventListener('input', function () { el.classList.remove('error'); hideMessage(); });\n";
  h += "    el.addEventListener('change', function () { el.classList.remove('error'); hideMessage(); });\n  });\n";
  h += "  form.addEventListener('submit', function (e) {\n    e.preventDefault(); clearErrors(); hideMessage();\n    var hasError = false;\n";
  h += "    if (!blockSelect.value) { blockSelect.classList.add('error'); hasError = true; }\n";
  h += "    var aptNo = parseInt(apartmentInput.value, 10);\n";
  h += "    if (!apartmentInput.value || isNaN(aptNo) || aptNo < 1) { apartmentInput.classList.add('error'); hasError = true; }\n";
  h += "    if (!residentTypeSelect.value) { residentTypeSelect.classList.add('error'); hasError = true; }\n";
  h += "    if (!nameSurnameInput.value.trim() || nameSurnameInput.value.trim().length < 3) { nameSurnameInput.classList.add('error'); hasError = true; }\n";
  h += "    var phoneVal = phoneNumberInput.value.trim();\n";
  h += "    if (!phoneVal || !/^05\\d{9}$/.test(phoneVal)) { phoneNumberInput.classList.add('error'); hasError = true; }\n";
  h += "    if (hasError) { showMessage(phoneNumberInput.classList.contains('error') ? 'Telefon numarasi 05XXXXXXXXX formatinda 11 haneli olmalidir.' : 'Lutfen tum alanlari doldurunuz.', 'error'); return; }\n";
  h += "    setLoading(true);\n    fetch('/api/register', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n";
  h += "      body: JSON.stringify({ block: blockSelect.value, apartmentNo: aptNo, residentType: residentTypeSelect.value, nameSurname: nameSurnameInput.value.trim(), phoneNumber: phoneNumberInput.value.trim() })\n    })\n";
  h += "    .then(function (r) { return r.json(); })\n    .then(function (data) {\n";
  h += "      if (data.success) { showMessage(data.message, 'success'); form.reset(); }\n      else { showMessage(data.message, 'error'); }\n    })\n";
  h += "    .catch(function () { showMessage('Baglanti hatasi.', 'error'); })\n    .finally(function () { setLoading(false); });\n  });\n";
  h += "  filterBlock.addEventListener('change', function () { renderList(); });\n";
  h += "  function loadRegistrations() {\n    listContainer.innerHTML = '<p class=\"loading-text\">Yukleniyor...</p>';\n";
  h += "    fetch('/api/registrations')\n      .then(function (r) { return r.json(); })\n      .then(function (data) {\n";
  h += "        if (data.success) { allRegistrations = data.data; renderList(); }\n        else { listContainer.innerHTML = '<p class=\"loading-text\">Veriler yuklenemedi.</p>'; }\n";
  h += "      })\n      .catch(function () { listContainer.innerHTML = '<p class=\"loading-text\">Baglanti hatasi.</p>'; });\n  }\n";
  h += "  function renderList() {\n    var filter = filterBlock.value;\n";
  h += "    var filtered = filter ? allRegistrations.filter(function (r) { return r.block === filter; }) : allRegistrations;\n";
  h += "    totalCount.textContent = filtered.length;\n    if (filtered.length === 0) {\n";
  h += "      listContainer.innerHTML = '<div class=\"empty-state\"><div class=\"empty-icon\">&#128237;</div><p>' + (filter ? filter + ' Blok icin kayit bulunamadi.' : 'Henuz kayit bulunmuyor.') + '</p></div>';\n      return;\n    }\n";
  h += "    var html = '<table class=\"reg-table\"><thead><tr><th>#</th><th>Blok</th><th>Daire No</th><th>Oturum Sekli</th><th>Telefon</th><th>Tarih</th><th></th></tr></thead><tbody>';\n";
  h += "    filtered.forEach(function (r, i) {\n      var dt = new Date(r.created_at);\n";
  h += "      var ds = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });\n";
  h += "      var bc = r.resident_type === 'Ev Sahibi' ? 'badge-owner' : 'badge-tenant';\n";
  h += "      html += '<tr><td>' + (i+1) + '</td><td><strong>' + r.block + '</strong></td><td>' + r.apartment_no + '</td><td><span class=\"badge ' + bc + '\">' + r.resident_type + '</span></td><td>' + (r.phone_number || '-') + '</td><td>' + ds + '</td><td><button class=\"delete-btn\" title=\"Sil\" onclick=\"window._deleteReg(' + r.id + ')\">&#128465;</button></td></tr>';\n";
  h += "    });\n    html += '</tbody></table>';\n    listContainer.innerHTML = html;\n  }\n";
  h += "  function deleteRegistration(id) {\n    if (!confirm('Bu kaydi silmek istediginizden emin misiniz?')) return;\n";
  h += "    fetch('/api/register/' + id, { method: 'DELETE' })\n      .then(function (r) { return r.json(); })\n";
  h += "      .then(function (data) { if (data.success) { loadRegistrations(); } else { alert(data.message || 'Silinemedi.'); } })\n";
  h += "      .catch(function () { alert('Baglanti hatasi.'); });\n  }\n  window._deleteReg = deleteRegistration;\n";
  h += "  document.getElementById('exportBtn').addEventListener('click', function () {\n    var filter = filterBlock.value;\n";
  h += "    var filtered = filter ? allRegistrations.filter(function (r) { return r.block === filter; }) : allRegistrations;\n";
  h += "    if (filtered.length === 0) { alert('Aktarilacak kayit bulunamadi.'); return; }\n";
  h += "    var BOM = '\\uFEFF';\n    var csv = BOM + '#;Blok;Daire No;Oturum Sekli;Telefon;Tarih\\n';\n";
  h += "    filtered.forEach(function (r, i) {\n      var dt = new Date(r.created_at);\n";
  h += "      var ds = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });\n";
  h += "      csv += (i + 1) + ';' + r.block + ';' + r.apartment_no + ';' + r.resident_type + ';' + (r.phone_number || '-') + ';' + ds + '\\n';\n    });\n";
  h += "    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });\n    var url = URL.createObjectURL(blob);\n";
  h += "    var a = document.createElement('a');\n    a.href = url;\n";
  h += "    a.download = 'kayitlar' + (filter ? '_' + filter + '_Blok' : '') + '.csv';\n";
  h += "    document.body.appendChild(a);\n    a.click();\n    document.body.removeChild(a);\n    URL.revokeObjectURL(url);\n  });\n";
  h += "  function showMessage(t, c) { messageDiv.textContent = t; messageDiv.className = 'message ' + c; }\n";
  h += "  function hideMessage() { messageDiv.className = 'message hidden'; }\n";
  h += "  function clearErrors() { document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); }); }\n";
  h += "  function setLoading(v) { submitBtn.disabled = v; btnText.className = v ? 'btn-text hidden' : 'btn-text'; btnLoading.className = v ? 'btn-loading' : 'btn-loading hidden'; }\n";
  h += "});\n";
  h += '<\/script>\n</body>\n</html>';
  try {
    fs.writeFileSync(indexPath, h, 'utf8');
    console.log('index.html generated: ' + fs.statSync(indexPath).size + ' bytes');
  } catch (e) {
    console.error('index.html generation failed:', e.message);
  }
})();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: function (res) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

app.post('/api/register', function (req, res) {  var block = req.body.block;
  var apartmentNo = req.body.apartmentNo;
  var residentType = req.body.residentType;
  var nameSurname = req.body.nameSurname;
  var phoneNumber = req.body.phoneNumber;

  if (!block || !apartmentNo || !residentType || !nameSurname || !phoneNumber) {
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

  var phoneRegex = /^05\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({ success: false, message: 'Telefon numarasi 05XXXXXXXXX formatinda 11 haneli olmalidir.' });
  }  sql`SELECT id FROM "Registration" WHERE block=${block} AND apartment_no=${aptNo} AND phone_number=${phoneNumber}`
    .then(function (rows) {
      if (rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: block + ' Blok, Daire ' + aptNo + ' icin bu telefon numarasi ile kayit zaten mevcut.'
        });
      }
      return sql`INSERT INTO "Registration" (block, apartment_no, resident_type, name_surname, phone_number) VALUES (${block},${aptNo},${residentType},${nameSurname.trim()},${phoneNumber})`
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
  sql`SELECT id, block, apartment_no, resident_type, phone_number, created_at FROM "Registration" ORDER BY block ASC, apartment_no ASC`
    .then(function (rows) {
      return res.json({ success: true, data: rows, total: rows.length });
    })
    .catch(function (err) {
      console.error('List error:', err);
      return res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
    });
});

app.get('/api/export-excel', function (req, res) {
  var block = req.query.block || '';  var query = block
    ? sql`SELECT * FROM "Registration" WHERE block=${block} ORDER BY block ASC, apartment_no ASC`
    : sql`SELECT * FROM "Registration" ORDER BY block ASC, apartment_no ASC`;
  query.then(function (rows) {
    var BOM = '\uFEFF';
    var csv = BOM;    csv += '#;Blok;Daire No;Oturum Sekli;Telefon;Kayit Tarihi\n';
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var dt = new Date(row.created_at);
      var dateStr = ('0' + dt.getDate()).slice(-2) + '.' + ('0' + (dt.getMonth() + 1)).slice(-2) + '.' + dt.getFullYear();
      csv += (j + 1) + ';' + row.block + ';' + row.apartment_no + ';' + row.resident_type + ';' + (row.phone_number || '-') + ';' + dateStr + '\n';
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
  sql`DELETE FROM "Registration" WHERE id=${id}`
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
  sql`SELECT id FROM "Registration" WHERE block=${block} AND apartment_no=${aptNo} AND resident_type=${residentType}`
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
