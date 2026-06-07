const fs   = require('fs');
const path = require('path');
const pool = require('./db');

// Applies every migration in migrations/ in sorted order. All statements use
// IF NOT EXISTS, so this is safe to run on every server boot.
async function runMigrations() {
  const dir   = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`[migrate] applied ${file}`);
  }
  console.log('[migrate] up to date');
}

module.exports = runMigrations;
