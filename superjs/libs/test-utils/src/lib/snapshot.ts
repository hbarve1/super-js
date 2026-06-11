/**
 * AST snapshot helpers. Produces a position-free, stable clone of an AST node
 * (or any node tree) so snapshot tests compare *structure* and aren't perturbed
 * by span shifts. `serializeNode` gives a deterministic JSON string.
 */

/** Keys dropped from every node — positional noise that breaks structural equality. */
const POSITIONAL_KEYS = new Set(['span', 'loc', 'start', 'end', 'offset']);

/**
 * Deep-clone `node`, dropping positional keys at every level. Arrays and plain
 * objects are recursed; primitives pass through. The result is safe to compare
 * with `toEqual` or to serialize.
 */
export function snapshotNode<T>(node: T): unknown {
  if (Array.isArray(node)) return node.map((n) => snapshotNode(n));
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (POSITIONAL_KEYS.has(k)) continue;
      out[k] = snapshotNode(v);
    }
    return out;
  }
  return node;
}

/** Deterministic JSON of the position-free snapshot (sorted keys). */
export function serializeNode(node: unknown, indent = 2): string {
  return JSON.stringify(sortKeys(snapshotNode(node)), null, indent);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

/** Structural equality after snapshotting both sides (ignores positions). */
export function astEqual(a: unknown, b: unknown): boolean {
  return serializeNode(a, 0) === serializeNode(b, 0);
}
