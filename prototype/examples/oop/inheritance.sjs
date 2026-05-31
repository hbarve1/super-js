// Inheritance in SJS
// SJS prefers composition over classical inheritance.
// Type hierarchies are expressed via interface extension (structural subtyping).
// Shared behaviour is shared via factory helpers, not base classes.

// ─── Base interface ───────────────────────────────────────────────────────────

interface Vehicle {
  make: string
  model: string
  year: number
  describe(): string
  start(): string
}

// ─── Extended interfaces (structural subtypes) ────────────────────────────────

interface ElectricVehicle extends Vehicle {
  batteryKwh: number
  range(): number
  charge(): string
}

interface HybridVehicle extends Vehicle {
  batteryKwh: number
  fuelLitres: number
  range(): number
}

// ─── Shared factory helper (replaces a "base class") ─────────────────────────

function baseVehicle(make: string, model: string, year: number) {
  return {
    make,
    model,
    year,
    describe: () => `${year} ${make} ${model}`,
    start: () => `${make} ${model} engine started`
  }
}

// ─── Concrete factories ───────────────────────────────────────────────────────

function createCar(make: string, model: string, year: number): Vehicle {
  return { ...baseVehicle(make, model, year) }
}

function createEV(
  make: string,
  model: string,
  year: number,
  batteryKwh: number
): ElectricVehicle {
  const base = baseVehicle(make, model, year)
  return {
    ...base,
    // Override start to be silent
    start: () => `${make} ${model} silently ready`,
    batteryKwh,
    range: () => Math.round(batteryKwh * 4),   // ~4 miles per kWh
    charge: () => `Charging ${make} ${model} (${batteryKwh} kWh)`
  }
}

function createHybrid(
  make: string,
  model: string,
  year: number,
  batteryKwh: number,
  fuelLitres: number
): HybridVehicle {
  const base = baseVehicle(make, model, year)
  const electricRange = batteryKwh * 4
  const fuelRange = fuelLitres * 12   // ~12 miles per litre
  return {
    ...base,
    batteryKwh,
    fuelLitres,
    range: () => Math.round(electricRange + fuelRange)
  }
}

// ─── Polymorphic helpers ───────────────────────────────────────────────────────

function describeVehicle(v: Vehicle): void {
  console.log(`${v.describe()} — ${v.start()}`)
}

// Structural narrowing: accept any Vehicle that also has `range()`
interface HasRange {
  range(): number
}

function printRange(v: Vehicle & HasRange): void {
  console.log(`  Range: ${v.range()} miles`)
}

function longestRange(fleet: (Vehicle & HasRange)[]): Vehicle? {
  if (fleet.length === 0) return null
  return fleet.reduce((best, v) => v.range() > best.range() ? v : best)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const camry  = createCar('Toyota', 'Camry', 2023)
  const model3 = createEV('Tesla', 'Model 3', 2024, 75)
  const prius  = createHybrid('Toyota', 'Prius', 2024, 8, 40)

  // Polymorphism over the base type
  const fleet: Vehicle[] = [camry, model3, prius]
  console.log('=== Fleet ===')
  for (const v of fleet) {
    describeVehicle(v)
  }

  // Subtype polymorphism — only EVs and hybrids
  const rangeFleet: (Vehicle & HasRange)[] = [model3, prius]
  console.log('\n=== Range ===')
  for (const v of rangeFleet) {
    console.log(v.describe())
    printRange(v)
  }

  const best = longestRange(rangeFleet)
  if (best !== null) {
    console.log(`\nLongest range: ${best.describe()}`)
  }

  // EV-specific behaviour
  console.log('\n=== EV ===')
  console.log(model3.charge())
}

main()
