async function answer(): Promise<number> { return 42; }

async function __main(): Promise<number> {
  return await answer();
}
