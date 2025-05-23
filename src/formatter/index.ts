import { format as prettierFormat, Options } from 'prettier';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

interface FormatOptions {
  check?: boolean;
  pattern?: string;
  config?: Options;
}

const defaultOptions: Options = {
  parser: 'typescript',
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
};

export async function format(options: FormatOptions = {}): Promise<void> {
  const { check = false, pattern = 'src/**/*.{ts,sjs}' } = options;
  const config = { ...defaultOptions, ...options.config };

  try {
    const files = await glob(pattern);
    
    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      const formatted = await prettierFormat(source, config);

      if (check) {
        if (source !== formatted) {
          throw new Error(`${file} needs to be formatted`);
        }
      } else {
        writeFileSync(file, formatted, 'utf-8');
      }
    }

    if (!check) {
      console.log('Formatting complete');
    } else {
      console.log('All files are properly formatted');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Formatting failed:', error.message);
    }
    throw error;
  }
} 