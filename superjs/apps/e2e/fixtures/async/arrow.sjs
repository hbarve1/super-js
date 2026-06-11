const fetchValue = async (): Promise<number> => 42;

async function __main(): Promise<number> {
  return await fetchValue();
}
