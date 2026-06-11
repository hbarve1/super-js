async function risky(): Promise<number> { return 42; }

async function __main(): Promise<number> {
  try {
    return await risky();
  } catch (e) {
    return -1;
  }
}
