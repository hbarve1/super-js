// SJS5: implements clause — structural conformance checking

// Interface definitions
interface Printable {
  print(): string;
}

interface Serializable {
  serialize(): string;
  deserialize(data: string): void;
}

interface Comparable<T> {
  compareTo(other: T): number;
}

// Class implementing single interface
class Document implements Printable {
  constructor(public title: string, public content: string) {}

  print(): string {
    return `=== ${this.title} ===\n${this.content}`;
  }
}

// Class implementing multiple interfaces
class Record implements Printable, Serializable {
  private data: Map<string, unknown> = new Map();

  print(): string {
    return JSON.stringify(Object.fromEntries(this.data));
  }

  serialize(): string {
    return JSON.stringify(Object.fromEntries(this.data));
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    for (const [k, v] of Object.entries(parsed)) {
      this.data.set(k, v);
    }
  }
}

// Generic interface implementation
class NumberBox implements Comparable<NumberBox> {
  constructor(public value: number) {}

  compareTo(other: NumberBox): number {
    return this.value - other.value;
  }
}

const a = new NumberBox(5);
const b = new NumberBox(3);
const cmp: number = a.compareTo(b); // positive (a > b)

// SJS-E012: if class doesn't fully implement interface
// class Broken implements Printable {
//   // missing print() method
//   title: string = "";
// }
// → SJS-E012: 'Broken' does not implement 'Printable': missing 'print'
