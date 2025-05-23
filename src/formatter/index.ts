interface FormatOptions {
  check?: boolean;
  sourceFile?: string;
}

export async function format(_options: FormatOptions = {}): Promise<void> {
  console.log('Formatting...');
  // TODO: Implement formatting
} 