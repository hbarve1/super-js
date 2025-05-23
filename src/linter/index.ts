interface LintOptions {
  fix?: boolean;
  sourceFile?: string;
}

export async function lint(_options: LintOptions = {}): Promise<void> {
  console.log('Linting...');
  // TODO: Implement linting
} 