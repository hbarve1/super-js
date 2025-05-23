#!/usr/bin/env node

const { spawn } = require('child_process');
const { resolve, relative } = require('path');
const { existsSync } = require('fs');
const { ensureDirs, cleanDirs, getOutputPath, compileFile } = require('./build-utils');
const config = require('../build.config');

async function main() {
  try {
    // Get the source file from command line arguments
    const sourceFile = process.argv[2];
    if (!sourceFile) {
      console.error('Please provide a .sjs file to run');
      process.exit(1);
    }

    // Resolve paths
    const cwd = process.cwd();
    const resolvedSource = resolve(cwd, sourceFile);

    // Check if source file exists
    if (!existsSync(resolvedSource)) {
      console.error(`Source file not found: ${resolvedSource}`);
      process.exit(1);
    }

    // Setup build environment
    if (config.clean.beforeBuild) {
      console.log('Cleaning build directories...');
      cleanDirs();
    }
    
    console.log('Ensuring build directories exist...');
    ensureDirs();

    // Get output path
    const compiledFile = getOutputPath(resolvedSource).replace(/\.sjs$/, '.js');

    // Compile the file
    console.log(`Compiling ${relative(cwd, resolvedSource)}...`);
    await compileFile(resolvedSource);

    // Check if compiled file exists
    if (!existsSync(compiledFile)) {
      console.error(`Compiled file not found: ${compiledFile}`);
      process.exit(1);
    }

    // Run the compiled file
    console.log(`Running ${relative(cwd, compiledFile)}...`);
    const run = spawn('node', [compiledFile], {
      stdio: 'inherit',
      shell: true
    });

    run.on('close', (code) => {
      process.exit(code);
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 