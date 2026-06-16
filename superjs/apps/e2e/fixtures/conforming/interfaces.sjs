type Point { x: number; y: number; }

function manhattan(p: Point): number {
  return p.x + p.y;
}

const __r: number = manhattan({ x: 19, y: 23 });
