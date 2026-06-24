/**
 * Runtime value display for DAP variables — sum types as `Tag(payload)` not raw objects.
 */

/** Format a runtime value for the VS Code variables panel. */
export function formatRuntimeValue(value: unknown): string {
  if (typeof value === 'object' && value !== null && '_tag' in value) {
    const rec = value as Record<string, unknown>;
    const tag = String(rec['_tag']);
    const payloads = Object.entries(rec)
      .filter(([k]) => k.startsWith('_') && k !== '_tag')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => JSON.stringify(v));
    return payloads.length > 0 ? `${tag}(${payloads.join(', ')})` : tag;
  }
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
