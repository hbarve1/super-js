import { describe, it, expect } from 'vitest';
import { lowerSource, serialize, deserialize } from '../index.js';
import type { IrNode } from '../index.js';

/** All `type` discriminants in the lowered tree (for shape assertions). */
function types(node: unknown, acc: string[] = []): string[] {
  if (node && typeof node === 'object') {
    if ('type' in node && typeof (node as { type: unknown }).type === 'string') acc.push((node as { type: string }).type);
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach((x) => types(x, acc));
      else if (v && typeof v === 'object') types(v, acc);
    }
  }
  return acc;
}
/** First top-level statement. */
function top(src: string): IrNode {
  return lowerSource(src).body[0] as IrNode;
}
/** Find the first node of a given `type`. */
function find(node: unknown, t: string): Record<string, unknown> | undefined {
  if (node && typeof node === 'object') {
    if ((node as { type?: string }).type === t) return node as Record<string, unknown>;
    for (const v of Object.values(node)) {
      const arr = Array.isArray(v) ? v : [v];
      for (const x of arr) { const r = find(x, t); if (r) return r; }
    }
  }
  return undefined;
}

describe('type erasure', () => {
  it('drops interface and type-alias declarations', () => {
    const ir = lowerSource('interface I { x: number; }\ntype A = number;\nconst y = 1;');
    expect(ir.body).toHaveLength(1);
    expect((ir.body[0] as { type: string }).type).toBe('VariableDeclaration');
  });
  it('erases type annotations on a variable', () => {
    const v = top('const x: number = 1;') as unknown as Record<string, unknown>;
    expect(JSON.stringify(v)).not.toContain('PrimitiveType');
  });
  it('erases an `as` assertion, keeping the expression', () => {
    const ir = lowerSource('const x = (y as string);');
    expect(types(ir)).not.toContain('TypeAssertion');
    expect(JSON.stringify(ir)).toContain('"name":"y"');
  });
  it('drops `import type`', () => {
    expect(lowerSource('import type { T } from "m";').body).toHaveLength(0);
  });
});

describe('sum-type construction (052)', () => {
  const RESULT = 'type Result<T, E> = Ok(T) | Err(E);\ntype Opt = Some(number) | None;\ntype Shape = Circle({ radius: number });\n';

  it('lowers a tuple variant to a tagged object { _tag, _0 }', () => {
    const obj = find(lowerSource(RESULT + 'const r = Ok(42);'), 'ObjectExpression')!;
    const json = JSON.stringify(obj);
    expect(json).toContain('"_tag"');
    expect(json).toContain('"Ok"');
    expect(json).toContain('"_0"');
  });
  it('lowers a unit variant to { _tag } only', () => {
    const obj = find(lowerSource(RESULT + 'const n = None;'), 'ObjectExpression')!;
    expect(JSON.stringify(obj)).toContain('"None"');
    expect(JSON.stringify(obj)).not.toContain('"_0"');
  });
  it('lowers a record variant by spreading fields', () => {
    const json = JSON.stringify(lowerSource(RESULT + 'const c = Circle({ radius: 5 });'));
    expect(json).toContain('"Circle"');
    expect(json).toContain('"radius"');
    expect(json).not.toContain('"_0"');
  });
  it('wraps a higher-order tuple constructor in an arrow', () => {
    const ir = lowerSource(RESULT + 'const xs = arr.map(Ok);');
    expect(types(ir)).toContain('ArrowFunctionExpression');
    expect(JSON.stringify(ir)).toContain('"_0"');
  });
});

describe('match lowering (053)', () => {
  const RESULT = 'type Result<T, E> = Ok(T) | Err(E);\n';

  it('lowers match to an invoked arrow with _tag checks', () => {
    const ir = lowerSource(RESULT + 'const v = match r { Ok(x) => x, Err(e) => 0, };');
    const t = types(ir);
    expect(t).toContain('ArrowFunctionExpression');
    expect(t).toContain('CallExpression');
    const json = JSON.stringify(ir);
    expect(json).toContain('"$m"');
    expect(json).toContain('"_tag"');
    expect(json).toContain('Non-exhaustive match');
  });
  it('omits the throw when a default arm is present', () => {
    const json = JSON.stringify(lowerSource(RESULT + 'const v = match r { Ok(x) => x, default => 0, };'));
    expect(json).not.toContain('Non-exhaustive match');
  });
  it('destructures a record variant pattern', () => {
    const json = JSON.stringify(lowerSource('type S = Rect({ w: number, h: number });\nconst a = match s { Rect({ w, h }) => w * h, };'));
    expect(json).toContain('ObjectPattern');
  });
});

describe('class lowering', () => {
  it('lowers constructor parameter-properties to this.x = x', () => {
    const json = JSON.stringify(lowerSource('class C { constructor(public x: number) {} }'));
    expect(json).toContain('ThisExpression');
    expect(json).toContain('AssignmentExpression');
  });
  it('drops abstract methods and access modifiers', () => {
    const ir = lowerSource('class C { private y: number = 0; m(): void {} }');
    const json = JSON.stringify(ir);
    expect(json).not.toContain('private');
    expect(types(ir)).toContain('MethodDefinition');
  });
});

describe('jsx lowering (050)', () => {
  it('lowers an element to React.createElement', () => {
    const json = JSON.stringify(lowerSource('const v = <div className="x">{y}</div>;'));
    expect(json).toContain('createElement');
    expect(json).toContain('"div"');
  });
  it('lowers a fragment to React.createElement(React.Fragment, null, …)', () => {
    const json = JSON.stringify(lowerSource('const v = <><x/></>;'));
    expect(json).toContain('Fragment');
  });
});

describe('serialization (.sjsir)', () => {
  it('round-trips a program through serialize/deserialize', () => {
    const ir = lowerSource('const x = 1; function f(a) { return a; }');
    const restored = deserialize(serialize(ir));
    expect(restored).toEqual(ir);
  });
  it('rejects a version mismatch', () => {
    expect(() => deserialize('{"sjsir":99,"program":{"type":"Program","body":[]}}')).toThrow(/version mismatch/);
  });
  it('emits a versioned envelope', () => {
    expect(JSON.parse(serialize(lowerSource('')))).toMatchObject({ sjsir: 1, program: { type: 'Program' } });
  });
});

describe('plain JS passthrough', () => {
  it('preserves control flow and operators', () => {
    const ir = lowerSource('for (let i = 0; i < n; i++) { if (i % 2 === 0) sum += i; }');
    const t = types(ir);
    expect(t).toEqual(expect.arrayContaining(['ForStatement', 'IfStatement', 'BinaryExpression', 'UpdateExpression']));
  });
  it('lowers template literals and optional chaining', () => {
    const ir = lowerSource('const s = `a${x}b`; const v = a?.b?.c;');
    const t = types(ir);
    expect(t).toContain('TemplateLiteral');
    expect(t).toContain('MemberExpression');
  });
});
