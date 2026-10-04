const { spawnSync } = require('node:child_process');
const path = require('node:path');

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this command through npm so npm_execpath is available.');

const command = process.argv[2] || 'dev';
const result = spawnSync(process.execPath, [npmCli, 'run', command], {
  cwd: path.resolve(__dirname, '../client'),
  stdio: 'inherit',
});

process.exit(result.status || 0);
