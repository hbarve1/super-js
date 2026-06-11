async function base(): Promise<number> { return 40; }
async function plusTwo(): Promise<number> { return (await base()) + 2; }

async function __main(): Promise<number> {
  return await plusTwo();
}
