import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { readFileSync } from 'fs';
import { TypeChecker } from '../typeChecker';

interface CompileOptions {
  watch?: boolean;
  outDir?: string;
}

export async function compile(options: CompileOptions = {}): Promise<void> {
  const { watch = false } = options;

  // Initialize type checker
  const typeChecker = new TypeChecker();

  try {
    // Parse the source file
    const sourceCode = readFileSync('example.sjs', 'utf-8');
    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    // Type checking phase
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
    console.error('Compilation failed:', error);
    throw error;
  }
} 