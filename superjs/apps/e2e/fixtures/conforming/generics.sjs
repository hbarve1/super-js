function identity<T>(x: T): T { return x; }
function first<T>(xs: T[]): T { return xs[0]; }

const a: number = identity(40);
const b: number = first([2, 8, 9]);
const __r: number = a + b;
