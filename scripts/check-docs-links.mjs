#!/usr/bin/env node
/**
 * check-docs-links.mjs — verify internal markdown links in docs/ resolve to files.
 * CI gate for WS-A3 / stage-6 broken-link requirement (ADR-011).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
const SKIP_PREFIXES = ['http://', 'https://', 'mailto:', '#', 'data:'];

function walkMd(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith('.md') || ent.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

function stripFencedCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

const WEBSITE_ROUTES = new Set([
  '/errors',
  '/playground',
  '/tour',
  '/docs',
  '/blog',
  '/community',
]);

function checkLink(fromFile, rawTarget) {
  const target = rawTarget.trim().split('#')[0].split('?')[0];
  if (!target || SKIP_PREFIXES.some((p) => target.startsWith(p))) return null;

  if (target.startsWith('/') && WEBSITE_ROUTES.has(target)) return null;

  const abs = normalize(resolve(dirname(fromFile), target));
  if (!abs.startsWith(ROOT)) {
    return { fromFile, rawTarget, reason: 'escapes repo root' };
  }
  if (!existsSync(abs)) {
    return { fromFile, rawTarget, reason: 'target missing' };
  }
  try {
    const st = statSync(abs);
    if (!st.isFile() && !st.isDirectory()) {
      return { fromFile, rawTarget, reason: 'not a file or directory' };
    }
  } catch {
    return { fromFile, rawTarget, reason: 'stat failed' };
  }
  return null;
}

const broken = [];
for (const file of walkMd(DOCS)) {
  const text = stripFencedCode(readFileSync(file, 'utf8'));
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    const err = checkLink(file, m[2]);
    if (err) broken.push(err);
  }
}

if (broken.length > 0) {
  console.error(`Broken docs links (${broken.length}):`);
  for (const b of broken) {
    const rel = b.fromFile.replace(ROOT + '/', '');
    console.error(`  ${rel}: (${b.rawTarget}) — ${b.reason}`);
  }
  process.exit(1);
}

console.log(`All internal links OK in ${walkMd(DOCS).length} docs files.`);
