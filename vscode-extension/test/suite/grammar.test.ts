import * as fs from 'fs';
import * as path from 'path';
import { Registry, IRawGrammar, INITIAL } from 'vscode-textmate';
import { loadWASM, createOnigScanner, createOnigString } from 'vscode-oniguruma';

// __dirname when compiled: out/test/suite — navigate back to source tree
const FIXTURES_DIR = path.join(__dirname, '../../../test/fixtures');
const GRAMMAR_PATH = path.join(__dirname, '../../../syntaxes/superjs.tmLanguage.json');
const TSX_GRAMMAR_PATH = path.join(__dirname, '../../../test/fixtures/TypeScript.tmLanguage.json');
const ONIG_WASM_PATH = path.join(__dirname, '../../../node_modules/vscode-oniguruma/release/onig.wasm');

const UPDATE_SNAPSHOTS = process.env['UPDATE_SNAPSHOTS'] === '1';

interface TokenLine {
  line: string;
  tokens: Array<{ startIndex: number; endIndex: number; scopes: string[] }>;
}

async function main(): Promise<void> {
  // Load oniguruma WASM
  const wasmBin = fs.readFileSync(ONIG_WASM_PATH);
  await loadWASM(wasmBin.buffer as ArrayBuffer);

  const registry = new Registry({
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
    loadGrammar: async (scopeName: string): Promise<IRawGrammar | null> => {
      if (scopeName === 'source.sjs') {
        return JSON.parse(fs.readFileSync(GRAMMAR_PATH, 'utf8')) as IRawGrammar;
      }
      if (scopeName === 'source.tsx' || scopeName === 'source.ts') {
        if (fs.existsSync(TSX_GRAMMAR_PATH)) {
          return JSON.parse(fs.readFileSync(TSX_GRAMMAR_PATH, 'utf8')) as IRawGrammar;
        }
        return null;
      }
      return null;
    }
  });

  const grammar = await registry.loadGrammar('source.sjs');
  if (!grammar) throw new Error('Failed to load source.sjs grammar');

  // Find all fixture .sjs files (not .snap, not .json)
  const fixtures = fs.readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith('.sjs'))
    .sort();

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const fixture of fixtures) {
    const fixturePath = path.join(FIXTURES_DIR, fixture);
    const snapPath = fixturePath + '.snap';
    const source = fs.readFileSync(fixturePath, 'utf8');
    const lines = source.split('\n');

    // Tokenize all lines
    const actual: TokenLine[] = [];
    let ruleStack = INITIAL;
    for (const line of lines) {
      const result = grammar.tokenizeLine(line, ruleStack);
      ruleStack = result.ruleStack;
      actual.push({
        line,
        tokens: result.tokens.map(t => ({
          startIndex: t.startIndex,
          endIndex: t.endIndex,
          scopes: t.scopes
        }))
      });
    }

    if (UPDATE_SNAPSHOTS) {
      fs.writeFileSync(snapPath, JSON.stringify(actual, null, 2));
      console.log(`  SNAP  ${fixture}`);
      passed++;
      continue;
    }

    if (!fs.existsSync(snapPath)) {
      console.error(`  MISSING SNAP  ${fixture} — run with UPDATE_SNAPSHOTS=1 to create`);
      failed++;
      failures.push(fixture);
      continue;
    }

    const expected: TokenLine[] = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
    const diff = diffSnapshots(expected, actual, fixture);
    if (diff.length === 0) {
      console.log(`  PASS  ${fixture}`);
      passed++;
    } else {
      console.error(`  FAIL  ${fixture}`);
      for (const d of diff) console.error(`    ${d}`);
      failed++;
      failures.push(fixture);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`\nFailed fixtures: ${failures.join(', ')}`);
    process.exit(1);
  }
}

function diffSnapshots(expected: TokenLine[], actual: TokenLine[], _fixture: string): string[] {
  const diffs: string[] = [];
  const maxLines = Math.max(expected.length, actual.length);
  for (let i = 0; i < maxLines; i++) {
    const exp = expected[i];
    const act = actual[i];
    if (!exp) { diffs.push(`Line ${i + 1}: unexpected line in actual`); continue; }
    if (!act) { diffs.push(`Line ${i + 1}: missing line in actual`); continue; }
    const maxTokens = Math.max(exp.tokens.length, act.tokens.length);
    for (let j = 0; j < maxTokens; j++) {
      const et = exp.tokens[j];
      const at = act.tokens[j];
      if (!et) { diffs.push(`L${i + 1}T${j}: extra token in actual: [${at.startIndex}-${at.endIndex}] ${at.scopes.join(' ')}`); continue; }
      if (!at) { diffs.push(`L${i + 1}T${j}: missing token in actual, expected: [${et.startIndex}-${et.endIndex}] ${et.scopes.join(' ')}`); continue; }
      if (et.startIndex !== at.startIndex || et.endIndex !== at.endIndex) {
        diffs.push(`L${i + 1}T${j}: range mismatch: expected [${et.startIndex}-${et.endIndex}] got [${at.startIndex}-${at.endIndex}]`);
      }
      const scopesDiff = et.scopes.join(' ') !== at.scopes.join(' ');
      if (scopesDiff) {
        diffs.push(`L${i + 1}T${j} [${at.startIndex}-${at.endIndex}]: scopes mismatch\n      expected: ${et.scopes.join(' ')}\n      actual:   ${at.scopes.join(' ')}`);
      }
    }
    if (diffs.length > 20) { diffs.push('... (truncated)'); break; }
  }
  return diffs;
}

main().catch(e => { console.error(e); process.exit(1); });
