async function unit(): Promise<number> { return 1; }

async function __main(): Promise<number> {
  const a = await unit();
  const b = await unit();
  return 40 + a + b;
}
