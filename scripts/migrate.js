require('dotenv').config();
const runMigrations = require('../server/runMigrations');
const pool          = require('../server/db');

runMigrations()
  .then(() => pool.end())
  .catch((e) => { console.error(e); process.exit(1); });
