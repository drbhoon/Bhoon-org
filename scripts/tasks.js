const { spawnSync } = require('node:child_process');
const path = require('node:path');

const task = process.argv[2];
const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;

function runNodePackage(directory, args) {
  if (!npmCli) throw new Error('Run this task through npm so npm_execpath is available.');
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: path.join(root, directory),
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function runPython(directory, args) {
  const candidates = process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python'];
  for (const executable of candidates) {
    const result = spawnSync(executable, args, {
      cwd: path.join(root, directory),
      stdio: 'inherit',
    });
    if (!result.error) {
      if (result.status !== 0) process.exit(result.status || 1);
      return;
    }
    if (result.error.code !== 'ENOENT') throw result.error;
  }
  throw new Error('Python was not found on PATH.');
}

if (task === 'start') {
  runNodePackage('services/gateway', ['start']);
} else if (task === 'build') {
  runNodePackage('apps/people', ['run', 'build']);
  runNodePackage('apps/stocks/frontend', ['run', 'build']);
} else if (task === 'test') {
  runNodePackage('services/gateway', ['test']);
  runPython('apps/stocks/backend', ['-m', 'pytest']);
} else {
  throw new Error(`Unknown task: ${task}`);
}
