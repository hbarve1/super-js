class Temperature {
  private celsius: number = 0;
  constructor(c: number) { this.celsius = c; }
  get value(): number { return this.celsius; }
}

const __r: number = new Temperature(42).value;
