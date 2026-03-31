const { exec } = require('child_process');
const os = require('os');

const mode = process.argv[2] || 'dryrun';
if (!['dryrun', 'delete'].includes(mode)) {
  console.error('Usage: node scripts/integration-test.js [dryrun|delete]');
  process.exit(1);
}

const url = `https://claude.ai?_autodelete_test=${mode}`;
const platform = os.platform();

console.log(`Opening ${url}`);
console.log(`Mode: ${mode === 'dryrun' ? 'dry run (find only)' : 'find & delete one chat'}`);
console.log('Check the top bar on claude.ai for results.\n');

if (platform === 'darwin') {
  exec(`open "${url}"`);
} else if (platform === 'win32') {
  exec(`start "" "${url}"`);
} else {
  exec(`xdg-open "${url}"`);
}
