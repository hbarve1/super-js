/**
 * `inspect` — a deterministic, dependency-free value formatter for debugging
 * and `console`-style output. Renders SJS sum-type variants (`{ _tag, _0 }`)
 * in their constructor form, e.g. `Ok(42)` / `Err("boom")`.
 */

export interface InspectOptions {
  /** Max depth before collapsing to `…`. Default 6. */
  readonly depth?: number;
}

export function inspect(value: unknown, options: InspectOptions = {}): string {
  const maxDepth = options.depth ?? 6;
  return format(value, maxDepth, new Set());
}

function format(value: unknown, depth: number, seen: Set<object>): string {
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
    case 'boolean':
      return String(value);
    case 'bigint':
      return `${value}n`;
    case 'symbol':
      return value.toString();
    case 'undefined':
      return 'undefined';
    case 'function':
      return value.name ? `[Function: ${value.name}]` : '[Function (anonymous)]';
    case 'object':
      break;
  }
  if (value === null) return 'null';

  const obj = value as object;
  if (seen.has(obj)) return '[Circular]';
  if (depth < 0) return '…';
  seen.add(obj);
  try {
    return formatObject(obj, depth, seen);
  } finally {
    seen.delete(obj);
  }
}

function formatObject(obj: object, depth: number, seen: Set<object>): string {
  // Sum-type variant: { _tag, _0, _1, … } or named record fields.
  if ('_tag' in obj && typeof (obj as { _tag: unknown })._tag === 'string') {
    return formatVariant(obj as Record<string, unknown>, depth, seen);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((v) => format(v, depth - 1, seen)).join(', ')}]`;
  }
  if (obj instanceof Map) {
    const entries = [...obj.entries()].map(
      ([k, v]) => `${format(k, depth - 1, seen)} => ${format(v, depth - 1, seen)}`,
    );
    return `Map(${obj.size}) {${entries.length ? ' ' + entries.join(', ') + ' ' : ''}}`;
  }
  if (obj instanceof Set) {
    const items = [...obj.values()].map((v) => format(v, depth - 1, seen));
    return `Set(${obj.size}) {${items.length ? ' ' + items.join(', ') + ' ' : ''}}`;
  }
  if (obj instanceof Error) {
    return `${obj.name}: ${obj.message}`;
  }
  if (obj instanceof RegExp || obj instanceof Date) {
    return obj.toString();
  }

  const entries = Object.entries(obj).map(
    ([k, v]) => `${formatKey(k)}: ${format(v, depth - 1, seen)}`,
  );
  const prefix = constructorName(obj);
  return `${prefix}{${entries.length ? ' ' + entries.join(', ') + ' ' : ''}}`;
}

function formatVariant(obj: Record<string, unknown>, depth: number, seen: Set<object>): string {
  const tag = String(obj['_tag']);
  const positional: string[] = [];
  for (let i = 0; `_${i}` in obj; i++) {
    positional.push(format(obj[`_${i}`], depth - 1, seen));
  }
  if (positional.length > 0) return `${tag}(${positional.join(', ')})`;

  const named = Object.entries(obj)
    .filter(([k]) => k !== '_tag')
    .map(([k, v]) => `${formatKey(k)}: ${format(v, depth - 1, seen)}`);
  return named.length ? `${tag}({ ${named.join(', ')} })` : tag;
}

function formatKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function constructorName(obj: object): string {
  const name = obj.constructor?.name;
  return name && name !== 'Object' ? `${name} ` : '';
}
