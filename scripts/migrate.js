require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('../server/db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration complete');
  await pool.end();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
