import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TypeChecker } from '../typeChecker';

interface CompileOptions {
  watch?: boolean;
  outDir?: string;
  sourceFile?: string;
}

export async function compile(options: CompileOptions = {}): Promise<void> {
  const { 
    watch = false,
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