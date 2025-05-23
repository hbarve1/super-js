#!/usr/bin/env node

const { spawn } = require('child_process');
const { resolve, relative, join } = require('path');
const { existsSync, readdirSync, statSync } = require('fs');

// Get the directory from command line arguments
const directory = process.argv[2] || '.';
const cwd = process.cwd();
const resolvedDir = resolve(cwd, directory);

// Function to find all .sjs files
function findSjsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.sjs')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Check if directory exists
if (!existsSync(resolvedDir)) {
  console.error(`Directory not found: ${resolvedDir}`);
  process.exit(1);
}

// Find all .sjs files
console.log(`Finding .sjs files in ${resolvedDir}...`);
const files = findSjsFiles(resolvedDir);
console.log(`Found ${files.length} .sjs files`);

if (files.length === 0) {
  console.log('No .sjs files found');
  process.exit(0);
}

// Compile all files first
console.log('Compiling all files...');
const compile = spawn('npm', ['run', 'compile:dir', '--', directory], {
  stdio: 'inherit',
  shell: true
});

compile.on('close', async (code) => {
  if (code !== 0) {
    console.error('Compilation failed');
    process.exit(code);
  }

  // Run each compiled file in sequence
  console.log('\nRunning compiled files:');
  for (const file of files) {
    const relativeFile = relative(cwd, file);
    const compiledFile = join('dist', relativeFile).replace(/\.sjs$/, '.js');
    
    if (!existsSync(compiledFile)) {
      console.error(`Compiled file not found: ${compiledFile}`);
      continue;
    }

    console.log(`\nRunning ${relativeFile}...`);
    console.log('----------------------------------------');
    
    try {
      await new Promise((resolve, reject) => {
        const run = spawn('node', [compiledFile], {
          stdio: 'inherit',
          shell: true
        });

        run.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Process exited with code ${code}`));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`Failed to run ${relativeFile}:`, error.message);
    }
    
    console.log('----------------------------------------');
  }
}); 