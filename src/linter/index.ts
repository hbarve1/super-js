interface LintOptions {
  fix?: boolean;
}

export async function lint(_options: LintOptions = {}): Promise<void> {
  console.log('Linting...');
  // TODO: Implement linting
} 