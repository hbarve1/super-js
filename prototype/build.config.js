module.exports = {
  // Build directories
  dirs: {
    // Compiler output
    dist: 'dist',
    // Compiled .sjs files output
    build: 'build',
    // Source maps output
    sourceMaps: 'build/sourcemaps',
    // Cache directory for incremental builds
    cache: '.build-cache',
    // Temporary files
    temp: '.tmp'
  },

  // Source map configuration
  sourceMaps: {
    enabled: true,
    inline: false,
    separate: true,
    sourceRoot: '/',
    includeContent: true
  },

  // Build optimization
  optimization: {
    // Enable incremental builds
    incremental: true,
    // Cache compiled files
    cache: true,
    // Parallel processing
    parallel: true,
    // Maximum parallel processes
    maxParallel: 4
  },

  // Clean options
  clean: {
    // Clean before each build
    beforeBuild: true,
    // Keep source maps when cleaning
    preserveSourceMaps: true,
    // Directories to exclude from cleaning
    exclude: [
      'build/cache',
      'build/temp'
    ]
  },

  // File organization
  organization: {
    // Group output by file type
    groupByType: false,
    // Flatten output structure
    flatten: false,
    // Custom output paths
    customPaths: {
      models: 'build/models',
      controllers: 'build/controllers',
      views: 'build/views'
    }
  }
}; 