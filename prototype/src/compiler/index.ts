import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { transformFromAstSync } from '@babel/core';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, basename, relative, dirname, join } from 'path';
import { TypeChecker } from '../typeChecker';

interface CompileOptions {
  watch?: boolean;
  outDir?: string;
  sourceFile?: string;
  sourceRoot?: string;
  directory?: string;
  target?: string;
  jsxPragma?: string;
  jsxFragmentPragma?: string;
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
  jsxFragmentPragma: string = 'sjs.Fragment'
): Promise<void> {
  const resolvedSourceFile = resolve(process.cwd(), sourceFile);
  console.log(`Compiling ${resolvedSourceFile}...`);

  // Parse the source file
  const sourceCode = readFileSync(resolvedSourceFile, 'utf-8');
  const ast = parse(sourceCode, {
    sourceType: 'module',
    plugins: [
      'typescript',
      ['jsx', { throwIfNamespace: false }],
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      ['decorators', { decoratorsBeforeExport: true }],
      'decoratorAutoAccessors'
    ],
    sourceFilename: relative(sourceRoot, resolvedSourceFile)
  });

  // Type checking phase
  console.log('Running type checker...');
  traverse(ast, {
    enter(path) {
      typeChecker.check(path);
    },
  });

  // Type stripping phase
  console.log('Stripping types...');
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
  console.log('Generating code...');

  // Preserve directory structure in output
  const relativeSourcePath = relative(sourceRoot, resolvedSourceFile);
  const outputFile = resolve(outDir, relativeSourcePath.replace(/\.sjs$/, '.js'));
  const outputDir = dirname(outputFile);
  
  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  const outputMapFile = outputFile + '.map';
  const sourceMapRelativePath = basename(outputMapFile);

  // Transform AST with preset-env and custom JSX transform
  const { ast: transformedAst } = transformFromAstSync(ast, sourceCode, {
    presets: [
      ['@babel/preset-env', {
        targets: {
          [target]: true
        }
      }]
    ],
    plugins: [
      ['@babel/plugin-transform-react-jsx', {
        pragma: jsxPragma,
        pragmaFrag: jsxFragmentPragma,
        runtime: 'classic',
        useBuiltIns: true
      }]
    ],
    sourceMaps: true,
    sourceFileName: relative(sourceRoot, resolvedSourceFile),
    sourceRoot: relative(dirname(outputFile), sourceRoot)
  }) || { ast: null };

  if (!transformedAst) {
    throw new Error('Failed to transform AST');
  }

  // Generate code with source maps
  const { code, map } = generate(transformedAst, {
    retainLines: true,
    compact: false,
    sourceMaps: true,
    sourceFileName: relative(sourceRoot, resolvedSourceFile),
    sourceRoot: relative(dirname(outputFile), sourceRoot),
    jsescOption: {
      minimal: true
    }
  });

  // Add source map comment to generated code
  const codeWithSourceMap = code + '\n//# sourceMappingURL=' + sourceMapRelativePath + '\n';

  // Write the output files
  writeFileSync(outputFile, codeWithSourceMap);
  writeFileSync(outputMapFile, JSON.stringify(map));

  console.log(`Output written to ${outputFile}`);
  console.log(`Source map written to ${outputMapFile}`);
}

export async function compile(options: CompileOptions = {}): Promise<void> {
  const { 
    watch = false,
    outDir = './dist',
    sourceFile,
    sourceRoot = process.cwd(),
    directory,
    target = 'es2022',
    jsxPragma = 'sjs.createElement',
    jsxFragmentPragma = 'sjs.Fragment'
  } = options;

  // Initialize type checker
  const typeChecker = new TypeChecker();

  try {
    if (directory) {
      // Compile all .sjs files in the directory
      const resolvedDir = resolve(process.cwd(), directory);
      console.log(`Finding .sjs files in ${resolvedDir}...`);
      
      const files = findSjsFiles(resolvedDir);
      console.log(`Found ${files.length} .sjs files`);
      
      for (const file of files) {
        await compileFile(file, outDir, sourceRoot, typeChecker, target, jsxPragma, jsxFragmentPragma);
      }
      
      console.log('Directory compilation successful');
    } else if (sourceFile) {
      // Compile single file
      await compileFile(sourceFile, outDir, sourceRoot, typeChecker, target, jsxPragma, jsxFragmentPragma);
      console.log('File compilation successful');
    } else {
      throw new Error('Either --source or --dir option must be specified');
    }

    if (watch) {
      console.log('Watching for changes...');
      // TODO: Implement watch mode
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Compilation failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    throw error;
  }
} 