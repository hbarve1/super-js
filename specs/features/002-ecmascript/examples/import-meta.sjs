// E4: import.meta and new.target

// import.meta — module metadata
// Type: { url: string; [key: string]: unknown }
const moduleUrl: string = import.meta.url;
const dirname: unknown = import.meta.dirname; // Node.js extension

// Resolve a path relative to the module
function resolveAsset(path: string): string {
  return new URL(path, import.meta.url).href;
}

// Check if running as main module (Node.js pattern)
const isMain: boolean = import.meta.url === `file://${process.argv[1]}`;

// Vite/bundler env
const isDev: unknown = import.meta.env?.DEV;
const mode: unknown = import.meta.env?.MODE;

// ---

// new.target — constructor function or undefined outside constructors
class Shape {
  constructor() {
    // new.target is the constructor that was called
    if (new.target === Shape) {
      throw new Error("Shape is abstract — subclass it");
    }
  }

  draw(): void {
    console.log(`Drawing ${new.target?.name ?? "unknown"}`);
  }
}

class Circle extends Shape {
  constructor(public radius: number) {
    super(); // new.target is Circle here
  }
}

// new.target is undefined when called as function (not constructor)
function checkNew() {
  if (new.target) {
    console.log("called with new");
  } else {
    console.log("called as function");
  }
}
