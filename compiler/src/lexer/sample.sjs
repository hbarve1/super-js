// Declarations
var a = 1;
let b: number = 2;
const c: string = 'hello';
function f<T>(x: T): T { return x; }
class MyClass extends Base implements Interface { constructor() {} static get value() { return 42; } }
new MyClass();
interface Interface { x: number; }
enum Color { Red, Green, Blue }
namespace NS { export const y = 1; }
type MyType = string | number;

// Control flow
if (a > 0) { } else { }
switch (b) { case 1: break; default: continue; }
for (let i = 0; i < 10; i++) { }
while (false) { }
do { } while (false);
break;
continue;
return;
yield 5;
async function afn() { await Promise.resolve(1); }

// Pattern matching
match (a) { when 1: b = 2; }

// Immutability
immutable let d = freeze({ x: 1 });

// Contract programming
function contractFn(x: number): number requires x > 0 ensures x < 100 invariant x !== 42 { return x; }

// Error handling
try { throw new Error('err'); } catch (e) { } finally { }
function g() { throws Error; raises Error; }

// Documentation
/**
 * @doc This is a documented function
 * @deprecated Use another function
 */
function docFn() {}

type T = string | number & boolean | any | void | null | undefined | never | unknown | readonly string;
private let priv = 1;
protected let prot = 2;
public let pub = 3;
let k: keyof MyType;
let t: typeof a;
let asType = a as string;
function isString(x: any): x is string { return typeof x === 'string'; }
function genericFn<Generic, Infer>(x: Generic): Infer { return x as Infer; }

// Modules
import { x } from 'mod';
export { y };

// Object
this.x = 1;

// Operators
if (x in y) { }
for (let v of arr) { }
if (x instanceof MyClass) { }
type T2 = typeof x;
delete obj.prop;
void 0;

// Misc
with (obj) { debugger; }

// Literals
let t1 = true, t2 = false, n1 = null, u1 = undefined, nan = NaN, inf = Infinity; 
