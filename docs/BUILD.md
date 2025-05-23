# Build System Documentation

## Overview

The super.js build system provides a flexible and powerful way to compile and organize your .sjs files. It supports various features including parallel compilation, source maps, incremental builds, and customizable output organization.

## Directory Structure

```
project/
├── dist/           # Compiler output (TypeScript → JavaScript)
├── build/          # Compiled .sjs files
│   ├── models/     # When using groupByType
│   ├── views/      # When using groupByType
│   ├── controllers/# When using groupByType
│   └── sourcemaps/ # Source map files
├── .build-cache/   # Cache for incremental builds
└── .tmp/          # Temporary build files
```

## Build Commands

### Basic Commands

```bash
# Compile a single file
npm run run:file path/to/file.sjs

# Compile all files in a directory
npm run run:dir path/to/directory

# Compile all files in the project
npm run run:all

# Compile example files
npm run run:examples
```

### Advanced Build Options

```bash
# Parallel compilation
npm run build:parallel

# Group files by type (models, views, controllers)
npm run build:grouped

# Flatten output structure
npm run build:flat

# Use custom output paths
npm run build:custom

# Incremental builds (faster rebuilds)
npm run build:incremental

# Generate source maps
npm run build:sourcemaps

# Watch mode (auto-rebuild on changes)
npm run build:watch

# Use build cache
npm run build:cache

# Clean before building
npm run build:clean
```

### Cleaning Commands

```bash
# Clean all build outputs
npm run clean

# Clean only .sjs build output
npm run clean:build

# Clean only compiler build output
npm run clean:dist
```

## Configuration

The build system is configured through `build.config.js`:

```javascript
module.exports = {
  // Build directories configuration
  dirs: {
    dist: 'dist',              // Compiler output
    build: 'build',            // Compiled .sjs files
    sourceMaps: 'build/sourcemaps', // Source maps
    cache: '.build-cache',     // Incremental build cache
    temp: '.tmp'               // Temporary files
  },

  // Source map configuration
  sourceMaps: {
    enabled: true,             // Enable source maps
    inline: false,             // Inline source maps in output
    separate: true,            // Generate separate .map files
    sourceRoot: '/',           // Source root for maps
    includeContent: true       // Include source in maps
  },

  // Build optimization
  optimization: {
    incremental: true,         // Enable incremental builds
    cache: true,               // Enable build caching
    parallel: true,            // Enable parallel compilation
    maxParallel: 4            // Max parallel processes
  },

  // Clean options
  clean: {
    beforeBuild: true,         // Clean before building
    preserveSourceMaps: true,  // Keep source maps when cleaning
    exclude: [                 // Exclude from cleaning
      'build/cache',
      'build/temp'
    ]
  },

  // File organization
  organization: {
    groupByType: false,        // Group by file type
    flatten: false,            // Flatten directory structure
    customPaths: {            // Custom output paths
      models: 'build/models',
      controllers: 'build/controllers',
      views: 'build/views'
    }
  }
};
```

## Features

### Parallel Compilation

The build system can compile multiple files in parallel, utilizing available CPU cores. Configure using:
- `optimization.parallel`: Enable/disable parallel compilation
- `optimization.maxParallel`: Maximum parallel processes

### Source Maps

Comprehensive source map support for debugging:
- Separate or inline source maps
- Source content inclusion
- Custom source root configuration
- Preserved during cleaning (optional)

### Incremental Builds

Faster rebuilds by only compiling changed files:
- File change detection
- Build caching
- Configurable cache location

### File Organization

Multiple ways to organize output files:
1. **Type-based**: Group by models, views, controllers
2. **Flat**: All files in single directory
3. **Custom**: Define custom output paths
4. **Preserve**: Maintain source directory structure

### Build Cleaning

Flexible cleaning options:
- Clean before builds
- Preserve specific directories
- Separate cleaning commands
- Configurable exclusions

## Best Practices

1. **Incremental Builds**
   - Enable `optimization.incremental` for faster rebuilds
   - Use `optimization.cache` to cache compilation results

2. **Source Maps**
   - Enable for development (`sourceMaps.enabled: true`)
   - Use separate files for production (`sourceMaps.separate: true`)

3. **Parallel Compilation**
   - Enable for large projects (`optimization.parallel: true`)
   - Adjust `maxParallel` based on your CPU

4. **File Organization**
   - Use `groupByType` for larger applications
   - Use `flatten` for simple projects
   - Use `customPaths` for specific requirements

## Troubleshooting

### Common Issues

1. **Slow Builds**
   - Enable parallel compilation
   - Use incremental builds
   - Enable build caching

2. **Missing Source Maps**
   - Check `sourceMaps.enabled`
   - Verify `sourceMaps.separate`
   - Check source map directory exists

3. **File Organization Issues**
   - Verify configuration in `build.config.js`
   - Check output directories exist
   - Review file type detection logic

### Debug Tips

1. Run with clean slate:
   ```bash
   npm run clean && npm run build:clean
   ```

2. Check build cache:
   ```bash
   npm run build:cache -- --verify
   ```

3. Verify source maps:
   ```bash
   npm run build:sourcemaps -- --check
   ``` 