import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { transformSync } from '@babel/core';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, basename, relative, dirname, join } from 'path';
import { TypeChecker } from '../typeChecker';
import type { PrototypeDiagnostic } from '../typeChecker/types';
import { preprocessSJS } from '../preprocessor';

// ── CompilationError ──────────────────────────────────────────────────────────

/**
 * Thrown by compile() when one or more error-severity diagnostics exist.
 * Callers can inspect `.diagnostics` for structured diagnostic data.
 *
 * The `.message` property is a human-readable Rust-style summary.
 */
export class CompilationError extends Error {
  constructor(
    public readonly diagnostics: PrototypeDiagnostic[],
    public readonly file?: string,
  ) {
    super(CompilationError.format(diagnostics, file))
    this.name = 'CompilationError'
  }

  /**
   * Formats diagnostics as a Rust-inspired human-readable string.
   *
   * Example output:
   *   error[SJS-E001]: I cannot assign a value of type 'string' to … 'number'.
   *    --> bad.sjs:1:19
   *    = spec: https://tc39.es/ecma262/#sec-let-and-const-declarations
   */
  static format(diagnostics: PrototypeDiagnostic[], file?: string): string {
    return diagnostics.map(d => {
      const loc = file ? `${basename(file)}:${d.line}:${d.column}` : `${d.line}:${d.column}`
      return [
        `${d.severity}[${d.code}]: ${d.message}`,
        ` --> ${loc}`,
        ` = spec: ${d.specUrl}`,
      ].join('\n')
    }).join('\n\n')
  }
}

// ── CompileOptions ────────────────────────────────────────────────────────────

interface CompileOptions {
  watch?: boolean;
  outDir?: string;
  sourceFile?: string;
  sourceRoot?: string;
  directory?: string;
  target?: string;
  jsxPragma?: string;
  jsxFragmentPragma?: string;
  silent?: boolean;
  /** Type-check only; do not write output files. Exit code 1 on errors. */
  noEmit?: boolean;
  /** Enable strict mode: SJS-W001 (implicit any) warnings. */
  strict?: boolean;
}

function loadProjectConfig(dir: string): Partial<CompileOptions> {
  const configPath = join(dir, 'superjs.config.json');
  if (!existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    const result: Partial<CompileOptions> = {};
    if (raw.jsxFactory) result.jsxPragma = raw.jsxFactory;
    if (raw.jsxFragment) result.jsxFragmentPragma = raw.jsxFragment;
    if (raw.jsxPragma) result.jsxPragma = raw.jsxPragma;
    if (raw.jsxFragmentPragma) result.jsxFragmentPragma = raw.jsxFragmentPragma;
    if (raw.target) result.target = raw.target;
    if (raw.outDir) result.outDir = raw.outDir;
    if (raw.strict !== undefined) result.strict = raw.strict;
    return result;
  } catch {
    return {};
  }
}

function findSjsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
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

async function compileFile(
  sourceFile: string,
  outDir: string,
  sourceRoot: string,
  typeChecker: TypeChecker,
  target: string = 'es2022',
  jsxPragma: string = 'sjs.createElement',
  jsxFragmentPragma: string = 'sjs.Fragment',
  log: (...args: unknown[]) => void = console.log.bind(console),
  noEmit: boolean = false
): Promise<void> {
  const resolvedSourceFile = resolve(process.cwd(), sourceFile);
  log(`Compiling ${resolvedSourceFile}...`);

  // Parse the source file
  const rawSource = readFileSync(resolvedSourceFile, 'utf-8');
  const sourceCode = preprocessSJS(rawSource);
  const ast = parse(sourceCode, {
    sourceType: 'module',
    plugins: [
      'typescript',
      'jsx',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      ['decorators', { decoratorsBeforeExport: true }],
      'decoratorAutoAccessors'
    ],
    sourceFilename: relative(sourceRoot, resolvedSourceFile)
  });

  // Type checking phase
  log('Running type checker...');
  typeChecker.reset();
  traverse(ast, {
    enter(path) {
      typeChecker.check(path);
    },
  });

  // Surface type errors — ECMA-262 §14.3.1, §15.2 (via type-system.md rules)
  const diagnostics = typeChecker.getDiagnostics().filter(d => d.severity === 'error');
  if (diagnostics.length > 0) {
    throw new CompilationError(diagnostics, resolvedSourceFile);
  }

  // Type stripping phase
  log('Stripping types...');
  traverse(ast, {
    // Remove TypeScript-specific nodes
    TSTypeAnnotation(path) {
      path.remove();
    },
    TSTypeReference(path) {
      path.remove();
    },
    TSTypeAliasDeclaration(path) {
      path.remove();
    },
    TSInterfaceDeclaration(path) {
      path.remove();
    },
    TSArrayType(path) {
      path.remove();
    },
    TSPropertySignature(path) {
      path.remove();
    },
    TSParameterProperty(path) {
      path.remove();
    },
    TSAsExpression(path) {
      path.replaceWith(path.node.expression);
    },
    TSTypeParameterDeclaration(path) {
      path.remove();
    },
    TSTypeParameter(path) {
      path.remove();
    },
    ClassProperty(path) {
      // Remove type annotation but keep the property
      if (path.node.typeAnnotation) {
        delete path.node.typeAnnotation;
      }
      // Handle property decorators
      if (path.node.decorators) {
        path.node.decorators.forEach(decorator => {
          if (decorator.expression.type === 'CallExpression') {
            const call = decorator.expression;
            if (call.typeParameters) {
              delete call.typeParameters;
            }
          }
        });
      }
      // Convert private to # prefix
      if (path.node.accessibility === 'private') {
        path.node.accessibility = undefined;
        const key = path.node.key as t.Identifier;
        const privateKey = t.identifier('#' + key.name);
        path.node.key = privateKey;

        // Initialize the property in constructor if not already initialized
        if (!path.node.value && path.parentPath.isClassBody() && !path.parentPath.node.body.some(node => 
          t.isClassMethod(node) && node.kind === 'constructor'
        )) {
          const constructor = t.classMethod(
            'constructor',
            t.identifier('constructor'),
            [],
            t.blockStatement([
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(t.thisExpression(), privateKey),
                  t.arrayExpression()
                )
              )
            ])
          );
          path.parentPath.node.body.unshift(constructor);
        }

        // Update all references to this property in methods
        path.parentPath.traverse({
          MemberExpression(memberPath) {
            if (
              t.isThisExpression(memberPath.node.object) &&
              t.isIdentifier(memberPath.node.property) &&
              memberPath.node.property.name === key.name
            ) {
              memberPath.node.property = privateKey;
            }
          }
        });
      }
    },
    ClassMethod(path) {
      // Remove return type
      if (path.node.returnType) {
        delete path.node.returnType;
      }
      // Remove parameter types
      path.node.params.forEach(param => {
        if (t.isIdentifier(param) && 'typeAnnotation' in param) {
          delete (param as any).typeAnnotation;
        }
        // Handle parameter decorators
        if ('decorators' in param && param.decorators) {
          param.decorators.forEach(decorator => {
            if (decorator.expression.type === 'CallExpression') {
              const call = decorator.expression;
              if (call.typeParameters) {
                delete call.typeParameters;
              }
            }
          });
        }
      });
      // Remove type parameters
      if (path.node.typeParameters) {
        delete path.node.typeParameters;
      }
      // Convert private to # prefix
      if (path.node.accessibility === 'private') {
        path.node.accessibility = undefined;
        const key = path.node.key as t.Identifier;
        path.node.key = t.identifier('#' + key.name);
      }
    },
    // Handle function declarations and expressions
    Function(path) {
      if (path.node.returnType) {
        delete path.node.returnType;
      }
      if (path.node.typeParameters) {
        delete path.node.typeParameters;
      }
      path.node.params.forEach(param => {
        if (t.isIdentifier(param) && 'typeAnnotation' in param) {
          delete (param as any).typeAnnotation;
        }
      });
    },
    // Handle decorators
    Decorator(path) {
      // Keep the decorator but remove any type arguments
      if (path.node.expression.type === 'CallExpression') {
        const call = path.node.expression;
        if (call.typeParameters) {
          delete call.typeParameters;
        }
        // Remove type arguments from decorator arguments
        call.arguments.forEach(arg => {
          if (t.isIdentifier(arg) && 'typeAnnotation' in arg) {
            delete (arg as any).typeAnnotation;
          }
        });
      }
    }
  });

  // Code generation phase
  log('Generating code...');

  // Preserve directory structure in output
  const relativeSourcePath = relative(sourceRoot, resolvedSourceFile);
  const outputFile = resolve(outDir, relativeSourcePath.replace(/\.sjs$/, '.js'));
  const outputDir = dirname(outputFile);
  
  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  const outputMapFile = outputFile + '.map';
  const sourceMapRelativePath = basename(outputMapFile);

  // Transform AST with preset-env and custom JSX transform
  // Map target to browserslist-compatible format
  const targetMap: Record<string, object> = {
    'es5':    { browsers: ['ie 11'] },
    'es2015': { browsers: ['last 2 Chrome versions', 'last 2 Firefox versions'] },
    'es2022': { node: 'current' },
  };
  const resolvedTargets = targetMap[target] ?? { node: 'current' };

  // Use transformSync on original source — avoids corrupted-AST issues
  const transformed = transformSync(sourceCode, {
    filename: resolvedSourceFile,
    presets: [
      ['@babel/preset-env', { targets: resolvedTargets }],
      ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
    ],
    plugins: [
      ['@babel/plugin-proposal-decorators', { version: '2023-11' }],
      ['@babel/plugin-transform-react-jsx', {
        pragma: jsxPragma,
        pragmaFrag: jsxFragmentPragma,
        runtime: 'classic',
      }],
    ],
    sourceMaps: true,
    sourceFileName: relative(sourceRoot, resolvedSourceFile),
    sourceRoot: relative(dirname(outputFile), sourceRoot),
  });

  if (!transformed || transformed.code == null) {
    throw new Error('Failed to transform source: Babel returned no output');
  }

  const codeWithSourceMap = transformed.code + '\n//# sourceMappingURL=' + sourceMapRelativePath + '\n';

  if (!noEmit) {
    writeFileSync(outputFile, codeWithSourceMap);
    if (transformed.map) {
      writeFileSync(outputMapFile, JSON.stringify(transformed.map));
    }
    log(`Output written to ${outputFile}`);
    log(`Source map written to ${outputMapFile}`);
  }
}

export async function compile(options: CompileOptions = {}): Promise<void> {
  // Load project config from superjs.config.json; CLI options take precedence
  const projectConfig = loadProjectConfig(process.cwd());
  const merged: CompileOptions = { ...projectConfig, ...options };

  const {
    watch = false,
    outDir = './dist',
    sourceFile,
    sourceRoot = process.cwd(),
    directory,
    target = 'es2022',
    jsxPragma = 'sjs.createElement',
    jsxFragmentPragma = 'sjs.Fragment',
    silent = false,
    noEmit = false,
    strict = false,
  } = merged;

  const log = silent ? () => {} : console.log.bind(console);

  // Initialize type checker
  const typeChecker = new TypeChecker({ strict });

  try {
    if (directory) {
      const resolvedDir = resolve(process.cwd(), directory);
      log(`Finding .sjs files in ${resolvedDir}...`);

      const files = findSjsFiles(resolvedDir);
      log(`Found ${files.length} .sjs files`);

      const effectiveSourceRoot = sourceRoot === process.cwd() ? resolvedDir : sourceRoot;
      for (const file of files) {
        await compileFile(file, outDir, effectiveSourceRoot, typeChecker, target, jsxPragma, jsxFragmentPragma, log, noEmit);
      }

      log('Directory compilation successful');
    } else if (sourceFile) {
      await compileFile(sourceFile, outDir, sourceRoot, typeChecker, target, jsxPragma, jsxFragmentPragma, log, noEmit);
      log('File compilation successful');
    } else {
      throw new Error('Either --source or --dir option must be specified');
    }

    if (watch) {
      log('Watching for changes...');
      const { Watcher } = await import('../watch/watcher');
      const resolvedSourceRoot = directory
        ? resolve(process.cwd(), directory)
        : resolve(process.cwd(), sourceRoot);
      const watcher = new Watcher(resolvedSourceRoot, outDir);
      const pattern = directory
        ? resolve(process.cwd(), directory) + '/**/*.sjs'
        : sourceFile ? resolve(process.cwd(), sourceFile) : resolvedSourceRoot + '/**/*.sjs';
      await watcher.start(pattern, (results) => {
        for (const [file, status] of results) {
          log(`[watch] ${file}: ${status}`);
        }
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (!silent) {
        console.error('Compilation failed:', error.message);
        if (error.stack) console.error(error.stack);
      }
    }
    throw error;
  }
} 