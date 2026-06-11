class Counter {
  private count: number = 0;
  constructor(start: number) { this.count = start; }
  inc(): void { this.count = this.count + 1; }
  value(): number { return this.count; }
}

const c = new Counter(40);
c.inc();
c.inc();
const __r: number = c.value();
