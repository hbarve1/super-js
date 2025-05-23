import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';
import { TypeChecker } from '../typeChecker';

interface CompileOptions {
  watch?: boolean;
  outDir?: string;
  sourceFile?: string;
}

export async function compile(options: CompileOptions = {}): Promise<void> {
  const { 
    watch = false,
    outDir = './dist',
    sourceFile = './examples/todo-list.sjs'
  } = options;

  // Initialize type checker
  const typeChecker = new TypeChecker();

  try {
    const resolvedSourceFile = resolve(process.cwd(), sourceFile);
    console.log(`Compiling ${resolvedSourceFile}...`);

    // Parse the source file
    const sourceCode = readFileSync(resolvedSourceFile, 'utf-8');
    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods'
      ],
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
      ClassProperty(path) {
        // Remove type annotation but keep the property
        if (path.node.typeAnnotation) {
          path.node.typeAnnotation = null;
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
      // Handle class methods
      ClassMethod(path) {
        // Remove return type
        if (path.node.returnType) {
          path.node.returnType = null;
        }
        // Remove parameter types
        path.node.params.forEach(param => {
          if (t.isIdentifier(param) && 'typeAnnotation' in param) {
            param.typeAnnotation = null;
          }
        });
        // Convert private to # prefix
        if (path.node.accessibility === 'private') {
          path.node.accessibility = undefined;
          const key = path.node.key as t.Identifier;
          path.node.key = t.identifier('#' + key.name);
        }
      }
    });

    // Code generation phase
    console.log('Generating code...');
    const { code } = generate(ast, {
      retainLines: true,
      compact: false,
      sourceMaps: true
    });

    // Ensure output directory exists
    const outputDir = resolve(process.cwd(), outDir);
    mkdirSync(outputDir, { recursive: true });

    // Write the output file
    const outputFile = resolve(outputDir, basename(sourceFile).replace(/\.sjs$/, '.js'));
    writeFileSync(outputFile, code);

    console.log(`Output written to ${outputFile}`);
    console.log('Compilation successful');

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