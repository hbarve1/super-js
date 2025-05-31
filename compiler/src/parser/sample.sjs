// Sample SuperJS file for parser analysis
let a = 1;
const b: number = 2;
var c: string;
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
// let if = 1; // reserved keyword as identifier (should fail if uncommented)
let arr: Array = [];
let obj: Object = {};
let union: string = 'foo'; // for now, just type name
let complex: MyType = 42;

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
