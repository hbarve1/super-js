type Shape = Circle(number) | Square(number) | Empty;

function area(s: Shape): number {
  return match s {
    Circle(r) => r * r * 3,
    Square(w) => w * w,
    Empty => 0,
  };
}

const a: number = area(Square(4));
