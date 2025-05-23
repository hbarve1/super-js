import { ESLint } from 'eslint';
import { resolve } from 'path';

interface LintOptions {
  fix?: boolean;
  pattern?: string;
}

const defaultConfig = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // ECMA standard rules
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': 'error',
    'no-undef': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-empty-function': 'error',
  },
};

export async function lint(options: LintOptions = {}): Promise<void> {
  const { fix = false, pattern = 'src/**/*.{ts,sjs}' } = options;

  try {
    const eslint = new ESLint({
      baseConfig: defaultConfig,
      fix,
      extensions: ['.ts', '.sjs'],
      useEslintrc: false,
      cwd: process.cwd(),
    });

    const results = await eslint.lintFiles(pattern);

    if (fix) {
      await ESLint.outputFixes(results);
    }

    const formatter = await eslint.loadFormatter('stylish');
    const resultText = await formatter.format(results);

    if (resultText) {
      console.log(resultText);
    }

    const errorCount = results.reduce((count, result) => count + result.errorCount, 0);
    if (errorCount > 0) {
      throw new Error(`Found ${errorCount} errors`);
    }

    console.log('Linting complete');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Linting failed:', error.message);
    }
    throw error;
  }
} 