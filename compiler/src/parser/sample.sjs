// Sample SuperJS file for parser analysis (all code is valid TypeScript/JS)

// Variable declarations
let a = 1;
const b: number = 2;
var c: string = 'test';
let π = 3.14;
let bin: number = 0b101;
let oct: number = 0o77;
let hex: number = 0x1A;
let s: string = 'hello';
let f = 2.5;
let flag: boolean = true;
let nothing: null = null;
let undef: undefined = undefined;
let nan: number = NaN;
let inf: number = Infinity;
let 变量: string = 'unicode';
let arr: number[] = [1, 2, 3];
let obj: { p: number, q: number } = { p: 1, q: 2 };
let union: string | number = 'foo';
let complex: { x: number, y: string } = { x: 1, y: 'bar' };

// Arithmetic, logical, ternary, function call, member access
let sum = a + b;
let isEqual = a === b;
let isNot = !flag;
let tern = flag ? a : b;
let called = add(a, b);
let member = obj.p;

// Destructuring
let [x, y] = [1, 2];
let { p, q } = obj;

// Import/export (commented out for single-file test)
// import { something } from './otherModule';
// export { a, b };

// Interface, type alias, enum, namespace
interface Foo { x: number; y: string; }
type Bar = string | number;
enum Color { Red, Green, Blue }
namespace NS { export const z = 1; }

// Pattern matching (not native JS/TS, so as comment)
// match (a) { when 1: b = 2; when 2: b = 3; }

// Control flow
if (a > 0) { b = 1; } else { b = 2; }
for (let i = 0; i < 10; i++) { a += i; }
while (a < 100) { a++; }
do { a--; } while (a > 0);
switch (b) { case 1: break; default: continue; }
// break; // Only valid inside loop/switch
// continue; // Only valid inside loop
function ret(): number { return 42; }
function* gen() { yield 5; }
async function afn() { await Promise.resolve(1); }

// Immutability (not native JS, so as comment)
// immutable let d = freeze({ x: 1 });
const d = Object.freeze({ x: 1 });

// Contract programming (not native JS, so as comment)
// function contractFn(x: number): number requires x > 0 ensures x < 100 invariant x !== 42 { return x; }
function contractFn(x: number): number { /* requires x > 0, ensures x < 100, invariant x !== 42 */ return x; }

// Error handling
try { throw new Error('err'); } catch (e) { } finally { }
function g() { throw new Error('err'); }

// Documentation
/**
 * @doc This is a documented function
 * @deprecated Use another function
 */
function docFn() {}

// Misc
with (obj) { debugger; }

// Template string
let message: string = `The value is ${a}`;

// Comments
// This is a single-line comment
/* This is a
   multi-line comment */

// Function declarations
function add(x: number, y: number): number { return x + y; }
function greet(name: string) { return `Hello, ${name}`; }
const arrow = (x: number): number => x * 2;

// Class declaration
class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }
}

// Template string
let message: string = `The value is ${a}`; 
