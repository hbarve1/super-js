#!/usr/bin/env node

const { spawn } = require('child_process');
const { resolve, relative, join } = require('path');
const { existsSync } = require('fs');

// Get the source file from command line arguments
const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error('Please provide a .sjs file to run');
  process.exit(1);
}

// Resolve paths
const cwd = process.cwd();
const resolvedSource = resolve(cwd, sourceFile);
const distPath = resolve(cwd, 'dist');
const relativeSource = relative(cwd, resolvedSource);
const compiledFile = join(distPath, relativeSource).replace(/\.sjs$/, '.js');

// Check if source file exists
if (!existsSync(resolvedSource)) {
  console.error(`Source file not found: ${resolvedSource}`);
  process.exit(1);
}

// First compile the file
const compile = spawn('npm', ['run', 'compile', '--', sourceFile], {
  stdio: 'inherit',
  shell: true
});

compile.on('close', (code) => {
  if (code !== 0) {
    console.error('Compilation failed');
    process.exit(code);
  }

  // Check if compiled file exists
  if (!existsSync(compiledFile)) {
    console.error(`Compiled file not found: ${compiledFile}`);
    process.exit(1);
  }

  // Run the compiled file
  console.log(`Running ${compiledFile}...`);
  const run = spawn('node', [compiledFile], {
    stdio: 'inherit',
    shell: true
  });

  run.on('close', (code) => {
    process.exit(code);
  });
}); 