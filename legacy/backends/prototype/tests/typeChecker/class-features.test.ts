/**
 * Tests for SJS class features:
 *   SJS4 — pub/priv/prot access modifiers (SJS-E011)
 *   SJS5 — implements clause checking (SJS-E012)
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string): PrototypeDiagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker()
  traverse(ast, {
    enter(path) { checker.check(path) },
    exit(path) { checker.exit(path) },
  })
  return checker.getDiagnostics()
}

function errors(source: string) {
  return typeCheck(source).filter(d => d.severity === 'error')
}

// ── SJS4: pub/priv/prot access modifiers ─────────────────────────────────────

describe('SJS4 — access modifiers (SJS-E011)', () => {
  it('emits SJS-E011 when private member accessed outside class', () => {
    const diags = errors(`
      class Wallet {
        private balance: number = 0
        getBalance(): number { return this.balance }
      }
      const w = new Wallet()
      w.balance
    `)
    expect(diags.some(d => d.code === 'SJS-E011')).toBe(true)
  })

  it('no SJS-E011 for public member access', () => {
    const diags = errors(`
      class Greeter {
        public name: string = "world"
      }
      const g = new Greeter()
      const n: string = g.name
    `)
    expect(diags.filter(d => d.code === 'SJS-E011')).toHaveLength(0)
  })

  it('no SJS-E011 for default (implicit public) member', () => {
    const diags = errors(`
      class Point {
        x: number = 0
        y: number = 0
      }
      const p = new Point()
      const v: number = p.x
    `)
    expect(diags.filter(d => d.code === 'SJS-E011')).toHaveLength(0)
  })

  it('emits SJS-E011 for protected member accessed outside hierarchy', () => {
    const diags = errors(`
      class Base {
        protected secret: string = "base"
      }
      const b = new Base()
      b.secret
    `)
    expect(diags.some(d => d.code === 'SJS-E011')).toBe(true)
  })

  it('no SJS-E011 for private method accessed via this inside class', () => {
    // private method accessed via this.method() inside the class body should be fine
    // (we only check external access via obj.method)
    const diags = errors(`
      class Counter {
        private count: number = 0
        increment(): void { this.count++ }
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E011')).toHaveLength(0)
  })
})

// ── SJS5: implements clause checking ─────────────────────────────────────────

describe('SJS5 — implements clause checking (SJS-E012)', () => {
  it('emits SJS-E012 when class is missing interface method', () => {
    const diags = errors(`
      interface Printable {
        print(): void
      }
      class Foo implements Printable {
        greet(): void { console.log("hi") }
      }
    `)
    expect(diags.some(d => d.code === 'SJS-E012')).toBe(true)
  })

  it('no SJS-E012 when class implements all interface members', () => {
    const diags = errors(`
      interface Printable {
        print(): void
      }
      class Foo implements Printable {
        print(): void { console.log("hello") }
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E012')).toHaveLength(0)
  })

  it('emits SJS-E012 when class is missing interface property', () => {
    const diags = errors(`
      interface Named {
        name: string
      }
      class Empty implements Named {}
    `)
    expect(diags.some(d => d.code === 'SJS-E012')).toBe(true)
  })

  it('no SJS-E012 when class implements property from interface', () => {
    const diags = errors(`
      interface Named {
        name: string
      }
      class Person implements Named {
        name: string = "Alice"
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E012')).toHaveLength(0)
  })

  it('no SJS-E012 for class without implements clause', () => {
    const diags = errors(`
      interface Serializable { serialize(): string }
      class Product {
        serialize(): string { return "{}" }
      }
    `)
    expect(diags.filter(d => d.code === 'SJS-E012')).toHaveLength(0)
  })

  it('emits SJS-E012 for each missing member in multi-member interface', () => {
    const diags = errors(`
      interface Shape {
        area(): number
        perimeter(): number
      }
      class Square implements Shape {
        area(): number { return 4 }
      }
    `)
    const e012 = diags.filter(d => d.code === 'SJS-E012')
    expect(e012.length).toBeGreaterThan(0)
  })
})
