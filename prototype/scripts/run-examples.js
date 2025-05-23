#!/usr/bin/env node

const { spawn } = require('child_process');

// Run the directory runner with the examples directory
const run = spawn('node', ['scripts/run-dir.js', 'examples'], {
  stdio: 'inherit',
  shell: true
});

run.on('close', (code) => {
  process.exit(code);
}); 