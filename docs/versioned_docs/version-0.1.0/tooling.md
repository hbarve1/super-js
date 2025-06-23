---
sidebar_position: 5
---

# Tooling

Super.js comes with a comprehensive set of built-in tools designed to enhance your development experience. All tools work out of the box with zero configuration while providing extensive customization options.

## Command Line Interface

The Super.js CLI provides a unified interface for all development tasks:

```bash
# Install Super.js globally
npm install -g superjs

# Get help
superjs --help

# Show version
superjs --version
```

## Compiler

The Super.js compiler transforms `.sjs` files into standard JavaScript with type checking and optimization.

### Basic Usage

```bash
# Compile a single file
superjs build --source file.sjs

# Compile with output directory
superjs build --source file.sjs --outDir dist

# Compile with specific target
superjs build --source file.sjs --target es2020

# Compile with source maps
superjs build --source file.sjs --sourcemap
```

### Advanced Compilation

```bash
# Compile entire directory
superjs build --dir ./src --outDir ./dist

# Compile with watch mode
superjs build --source file.sjs --watch

# Compile with specific configuration
superjs build --source file.sjs --config super.config.js

# Compile with custom output format
superjs build --source file.sjs --format esm
```

### JavaScript Version Targeting

```bash
# Target ES5 (for older browsers)
superjs build --source file.sjs --target es5

# Target ES2015 (ES6)
superjs build --source file.sjs --target es2015

# Target ES2020
superjs build --source file.sjs --target es2020

# Target ES2022 (default)
superjs build --source file.sjs --target es2022
```

## Formatter

The built-in formatter ensures consistent code style across your project.

### Basic Formatting

```bash
# Format a single file
superjs format file.sjs

# Format entire directory
superjs format --dir ./src

# Format with specific options
superjs format file.sjs --indent 4 --semicolons
```

### Formatting Options

```bash
# Set indentation
superjs format file.sjs --indent 2

# Configure semicolons
superjs format file.sjs --semicolons always

# Set line length
superjs format file.sjs --lineLength 80

# Configure quotes
superjs format file.sjs --quotes single

# Configure trailing commas
superjs format file.sjs --trailingComma es5
```

### Formatting Configuration

Create a `.superjsrc` file for project-wide formatting rules:

```json
{
  "format": {
    "indent": 2,
    "semicolons": "always",
    "quotes": "single",
    "trailingComma": "es5",
    "lineLength": 80,
    "bracketSpacing": true,
    "arrowParens": "avoid"
  }
}
```

## Linter

The integrated linter provides static analysis and enforces coding standards.

### Basic Linting

```bash
# Lint a single file
superjs lint file.sjs

# Lint entire directory
superjs lint --dir ./src

# Lint with auto-fix
superjs lint file.sjs --fix

# Lint with specific rules
superjs lint file.sjs --rules strict
```

### Linting Rules

```bash
# Enable all rules
superjs lint file.sjs --rules all

# Enable specific rule set
superjs lint file.sjs --rules ecma

# Disable specific rules
superjs lint file.sjs --disable no-unused-vars

# Set error level
superjs lint file.sjs --error-level error
```

### Linting Configuration

Configure linting rules in `.superjsrc`:

```json
{
  "lint": {
    "rules": {
      "no-unused-vars": "error",
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error"
    },
    "ecmaVersion": 2022,
    "sourceType": "module"
  }
}
```

## Testing Framework

Super.js includes a built-in testing framework similar to Jest.

### Basic Testing

```bash
# Run all tests
superjs test

# Run tests in specific directory
superjs test --dir ./tests

# Run tests matching pattern
superjs test --pattern "*.test.sjs"

# Run tests with coverage
superjs test --coverage

# Run tests in watch mode
superjs test --watch
```

### Writing Tests

```javascript
// math.test.sjs
import { describe, it, expect } from 'superjs/test';
import { add, multiply } from './math.sjs';

describe('Math functions', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });

  it('should multiply two numbers correctly', () => {
    expect(multiply(2, 3)).toBe(6);
    expect(multiply(0, 5)).toBe(0);
  });

  it('should handle edge cases', () => {
    expect(add(Number.MAX_SAFE_INTEGER, 1)).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
  });
});
```

### Test Configuration

Configure testing in `.superjsrc`:

```json
{
  "test": {
    "coverage": {
      "enabled": true,
      "threshold": 80,
      "exclude": ["node_modules/**", "dist/**"]
    },
    "timeout": 5000,
    "setupFiles": ["./test-setup.sjs"]
  }
}
```

## Development Server

The development server provides hot reloading and fast compilation for development.

### Starting the Server

```bash
# Start development server
superjs dev

# Start with specific port
superjs dev --port 3000

# Start with custom host
superjs dev --host 0.0.0.0

# Start with specific entry point
superjs dev --entry src/index.sjs
```

### Development Features

- **Hot Reloading**: Automatic recompilation on file changes
- **Source Maps**: Full debugging support
- **Error Overlay**: In-browser error display
- **Fast Refresh**: Preserve component state during updates
- **Live Reload**: Automatic browser refresh

## Configuration

### Project Configuration

Create a `super.config.js` file in your project root:

```javascript
module.exports = {
  // Compiler options
  compiler: {
    target: 'es2022',
    module: 'esnext',
    sourcemap: true,
    outDir: './dist',
    rootDir: './src'
  },

  // Formatter options
  format: {
    indent: 2,
    semicolons: 'always',
    quotes: 'single',
    trailingComma: 'es5',
    lineLength: 80
  },

  // Linter options
  lint: {
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error'
    },
    ecmaVersion: 2022
  },

  // Test options
  test: {
    coverage: {
      enabled: true,
      threshold: 80
    },
    timeout: 5000
  },

  // Development server options
  dev: {
    port: 3000,
    host: 'localhost',
    open: true
  }
};
```

### Environment-Specific Configuration

```javascript
module.exports = {
  // Base configuration
  ...require('./super.config.base.js'),

  // Environment-specific overrides
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      target: 'es2015',
      sourcemap: false,
      minify: true
    }
  }),

  ...(process.env.NODE_ENV === 'development' && {
    compiler: {
      sourcemap: true,
      watch: true
    },
    dev: {
      port: 3001
    }
  })
};
```

## IDE Integration

### VS Code Extension

Install the Super.js VS Code extension for enhanced development experience:

```bash
code --install-extension superjs.superjs-vscode
```

Features:
- Syntax highlighting for `.sjs` files
- IntelliSense and autocompletion
- Error highlighting and quick fixes
- Format on save
- Integrated terminal commands

### Configuration Files

Create `.vscode/settings.json` for workspace-specific settings:

```json
{
  "superjs.formatOnSave": true,
  "superjs.lintOnSave": true,
  "superjs.defaultTarget": "es2022",
  "superjs.showErrors": true
}
```

## Build Tools Integration

### Webpack Integration

```javascript
// webpack.config.js
const SuperJsPlugin = require('superjs-webpack-plugin');

module.exports = {
  entry: './src/index.sjs',
  module: {
    rules: [
      {
        test: /\.sjs$/,
        use: 'superjs-loader'
      }
    ]
  },
  plugins: [
    new SuperJsPlugin({
      target: 'es2020',
      sourcemap: true
    })
  ]
};
```

### Rollup Integration

```javascript
// rollup.config.js
import superjs from 'rollup-plugin-superjs';

export default {
  input: 'src/index.sjs',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    superjs({
      target: 'es2020',
      sourcemap: true
    })
  ]
};
```

### Vite Integration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import superjs from 'vite-plugin-superjs';

export default defineConfig({
  plugins: [
    superjs({
      target: 'es2020',
      sourcemap: true
    })
  ]
});
```

## Performance Optimization

### Compilation Optimization

```bash
# Enable incremental compilation
superjs build --incremental

# Enable parallel compilation
superjs build --parallel

# Enable caching
superjs build --cache

# Optimize for production
superjs build --optimize
```

### Development Optimization

```bash
# Fast development mode
superjs dev --fast

# Skip type checking in development
superjs dev --skip-type-check

# Enable hot module replacement
superjs dev --hmr
```

## Debugging

### Source Maps

```bash
# Generate source maps
superjs build --sourcemap

# Generate inline source maps
superjs build --sourcemap inline

# Generate external source maps
superjs build --sourcemap external
```

### Debug Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Super.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.sjs",
      "runtimeArgs": ["--require", "superjs/register"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

This comprehensive tooling suite provides everything you need for productive Super.js development, from compilation to testing, with zero configuration required to get started. 