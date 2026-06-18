// @superjs/std-async — small async helpers over Promise.

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve: (value: void) => void): void => {
    setTimeout(resolve, ms);
  });
}

export async function delayValue<T>(value: T, ms: number): Promise<T> {
  await sleep(ms);
  return value;
}
