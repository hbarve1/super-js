#!/usr/bin/env node
/**
 * smoke-playground-run.mjs — POST a minimal snippet to a playground /run endpoint.
 *
 * Usage:
 *   PLAYGROUND_RUN_URL=https://superjs-playground.<account>.workers.dev/run node scripts/smoke-playground-run.mjs
 *   node scripts/smoke-playground-run.mjs https://superjs-playground.<account>.workers.dev/run
 *
 * Also accepts a base URL without /run (appends /run).
 */
const raw = process.env.PLAYGROUND_RUN_URL ?? process.argv[2];
if (!raw) {
  console.error('Usage: PLAYGROUND_RUN_URL=<url> node scripts/smoke-playground-run.mjs');
  console.error('   or: node scripts/smoke-playground-run.mjs <url>');
  process.exit(1);
}

const runUrl = raw.endsWith('/run')
  ? raw
  : `${raw.replace(/\/$/, '')}/run`;

const baseUrl = runUrl.replace(/\/run$/, '');

const SAMPLE = `export function answer(): number {
  return 42
}
`;

async function main() {
  const healthUrl = `${baseUrl}/health`;
  const healthRes = await fetch(healthUrl);
  if (!healthRes.ok) {
    console.error(`GET ${healthUrl} failed: ${healthRes.status}`);
    process.exit(1);
  }
  const health = await healthRes.json();
  if (!health.ok) {
    console.error('Health check returned ok=false');
    process.exit(1);
  }

  const res = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: SAMPLE, mode: 'node' }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`POST ${runUrl} failed: ${res.status} ${text}`);
    process.exit(1);
  }

  const body = await res.json();
  if (typeof body.compiledSource !== 'string') {
    console.error('Response missing compiledSource');
    process.exit(1);
  }
  if (!Array.isArray(body.errors)) {
    console.error('Response missing errors array');
    process.exit(1);
  }
  if (body.errors.length > 0) {
    console.error('Unexpected compile/runtime errors:', body.errors);
    process.exit(1);
  }

  console.log(`playground smoke OK — ${runUrl} (${body.timingMs ?? '?'} ms)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
