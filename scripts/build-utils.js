const { resolve, relative, join, dirname, basename } = require('path');
const { existsSync, mkdirSync, readdirSync, statSync, rmSync } = require('fs');
const { cpus } = require('os');
const { spawn } = require('child_process');
const config = require('../build.config.js');

// Ensure all build directories exist
function ensureDirs() {
  Object.values(config.dirs).forEach(dir => {
    mkdirSync(resolve(process.cwd(), dir), { recursive: true });
  });
}

// Clean directories based on configuration
function cleanDirs(options = {}) {
  const { 
    preserveSourceMaps = config.clean.preserveSourceMaps,
    exclude = config.clean.exclude
  } = options;

  Object.entries(config.dirs).forEach(([key, dir]) => {
    const resolvedDir = resolve(process.cwd(), dir);
    
    // Skip if directory should be excluded
    if (exclude.some(pattern => dir.startsWith(pattern))) {
      return;
    }
    
    // Skip source maps if they should be preserved
    if (preserveSourceMaps && key === 'sourceMaps') {
      return;
    }

    if (existsSync(resolvedDir)) {
      rmSync(resolvedDir, { recursive: true, force: true });
      mkdirSync(resolvedDir, { recursive: true });
    }
  });
}

// Get output path based on configuration
function getOutputPath(inputFile) {
  const cwd = process.cwd();
  const relativeFile = relative(cwd, inputFile);
  
  // Check for custom paths
  const fileType = getFileType(relativeFile);
  if (config.organization.customPaths[fileType]) {
    return join(config.organization.customPaths[fileType], basename(relativeFile));
  }
  
  // Group by type if enabled
  if (config.organization.groupByType) {
    return join(config.dirs.build, fileType, relativeFile);
  }
  
  // Flatten if enabled
  if (config.organization.flatten) {
    return join(config.dirs.build, basename(relativeFile));
  }
  
  // Default: preserve directory structure
  return join(config.dirs.build, relativeFile);
}

// Get file type from path
function getFileType(filePath) {
  const dir = dirname(filePath).toLowerCase();
  if (dir.includes('model')) return 'models';
  if (dir.includes('controller')) return 'controllers';
  if (dir.includes('view')) return 'views';
  return 'other';
}

// Run compilation in parallel
async function parallelCompile(files, options = {}) {
  const maxParallel = config.optimization.parallel ? 
    (options.maxParallel || config.optimization.maxParallel || cpus().length) : 1;
  
  const chunks = [];
  for (let i = 0; i < files.length; i += maxParallel) {
    chunks.push(files.slice(i, i + maxParallel));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(file => compileFile(file, options)));
  }
}

// Compile a single file
async function compileFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    const outputPath = getOutputPath(file);
    const sourceMapPath = config.sourceMaps.enabled ? 
      join(config.dirs.sourceMaps, relative(config.dirs.build, outputPath) + '.map') :
      null;

    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });
    if (sourceMapPath) {
      mkdirSync(dirname(sourceMapPath), { recursive: true });
    }

    const args = [
      'run',
      'compile',
      '--',
      file,
      '--outDir', dirname(outputPath)
    ];

    if (sourceMapPath) {
      args.push('--sourceMap', sourceMapPath);
    }

    const compile = spawn('npm', args, {
      stdio: 'inherit',
      shell: true
    });

    compile.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Compilation failed for ${file}`));
      }
    });
  });
}

// Find all .sjs files in directory
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

module.exports = {
  ensureDirs,
  cleanDirs,
  getOutputPath,
  parallelCompile,
  compileFile,
  findSjsFiles
}; 