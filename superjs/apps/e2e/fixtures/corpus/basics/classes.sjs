// Class Features Example

// Shape interface
type Shape {
  getArea(): number;
  getPerimeter(): number;
}

// Abstract base class
abstract class BaseShape implements Shape {
  protected color: string;

  constructor(color: string) {
    this.color = color;
  }

  abstract getArea(): number;
  abstract getPerimeter(): number;

  getColor(): string {
    return this.color;
  }
}

// Circle implementation
class Circle extends BaseShape {
  #radius: number;  // Private field

  constructor(radius: number, color: string) {
    super(color);
    this.#radius = radius;
  }

  getArea(): number {
    return Math.PI * this.#radius * this.#radius;
  }

  getPerimeter(): number {
    return 2 * Math.PI * this.#radius;
  }

  // Static method
  static fromDiameter(diameter: number, color: string): Circle {
    return new Circle(diameter / 2, color);
  }
}

// Rectangle implementation
class Rectangle extends BaseShape {
  private width: number;  // TypeScript-style private
  private height: number;

  constructor(width: number, height: number, color: string) {
    super(color);
    this.width = width;
    this.height = height;
  }

  getArea(): number {
    return this.width * this.height;
  }

  getPerimeter(): number {
    return 2 * (this.width + this.height);
  }
}

// Usage example
function main(): void {
  const circle = new Circle(5, 'red');
  const bigCircle = Circle.fromDiameter(12, 'blue');
  const rectangle = new Rectangle(4, 6, 'green');

  const shapes: Shape[] = [circle, bigCircle, rectangle];

  shapes.forEach(shape => {
    console.log(`Shape: ${shape.constructor.name}`);
    console.log(`- Color: ${shape.getColor()}`);
    console.log(`- Area: ${shape.getArea().toFixed(2)}`);
    console.log(`- Perimeter: ${shape.getPerimeter().toFixed(2)}`);
    console.log('---');
  });
}

main(); 