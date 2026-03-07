var fs = require('fs');
var s = fs.readFileSync('server.js', 'utf8');

// Check if ensureTable already exists
if (s.indexOf('ensureTable') !== -1) {
  console.log('ALREADY PATCHED');
  process.exit(0);
}

// Add table creation code after "var app = express();"
var marker = 'var app = express();';
var idx = s.indexOf(marker);
if (idx === -1) {
  console.log('ERROR: marker not found');
  process.exit(1);
}

var patch = '\n\n// ensureTable: create table if not exists\n' +
  'sql`CREATE TABLE IF NOT EXISTS "Registration" ("id" SERIAL NOT NULL, "block" TEXT NOT NULL, "apartment_no" INTEGER NOT NULL, "resident_type" TEXT NOT NULL, "name_surname" TEXT NOT NULL, "phone_number" TEXT NOT NULL DEFAULT \'\', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Registration_pkey" PRIMARY KEY ("id"))`\n' +
  '.then(function () { console.log("Table ensured OK"); return sql`ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "phone_number" TEXT NOT NULL DEFAULT \'\'`; })\n' +
  '.then(function () { console.log("phone_number column OK"); })\n' +
  '.catch(function (e) { console.error("Table init error:", e.message); });\n';

s = s.slice(0, idx + marker.length) + patch + s.slice(idx + marker.length);
fs.writeFileSync('server.js', s, 'utf8');
console.log('PATCHED OK: ' + fs.statSync('server.js').size + ' bytes');
