/**
 * `lint` — the SuperJS linter (Stage 3). Walks the parsed AST and reports style
 * findings as registry diagnostics (SJS-L001…). Rules implemented:
 *
 * - **L001 prefer-const** — a `let` binding (with an initialiser) never reassigned.
 * - **L002 no-var** — `var` declaration; use `let` / `const`.
 * - **L003 eqeqeq** — `==` / `!=`; use `===` / `!==`.
 * - **L004 no-for-in** — `for…in`; prefer `for…of` for arrays / iterables.
 * - **L005 no-debugger** — a `debugger` statement.
 * - **L006 no-empty-match** — a `match` expression with no arms.
 * - **L007 no-redundant-match-arm** — an arm whose variant is already handled.
 * - **L008 prefer-arrow-callback** — an anonymous `function` expression passed
 *   directly as a call argument; an arrow is shorter and keeps lexical `this`.
 *
 * `prefer-const` is name-based and conservative: any assignment to a name (in any
 * scope) suppresses the finding, so shadowing never produces a false positive.
 */

import type {
  Program, Diagnostic, DiagnosticCode, Span, Expression, Pattern, Node, MatchPattern,
} from '@superjs/types';
import { parse } from '@superjs/parser';
import { createDiagnostic, type MessageParams } from '@superjs/diagnostics';

/** Lint source. Parse errors are returned alongside any lint findings. */
export function lint(source: string, file?: string): Diagnostic[] {
  const { program, diagnostics } = parse(source, { file });
  const out: Diagnostic[] = diagnostics.filter((d) => d.severity === 'error').map((d) => ({ ...d }));

  const reassigned = collectReassigned(program);
  const diag = (code: DiagnosticCode, span: Span, params?: MessageParams): void => {
    out.push(createDiagnostic({ code, span, ...(file !== undefined ? { file } : {}), ...(params ? { params } : {}) }));
  };

  walk(program, (n) => {
    switch (n.kind) {
      case 'VariableDecl':
        if (n.declKind === 'var') { diag('SJS-L002', n.span); break; }
        if (n.declKind === 'let') {
          for (const d of n.declarators) {
            if (d.id.kind === 'Identifier' && d.init && !reassigned.has(d.id.name)) {
              diag('SJS-L001', d.id.span, { name: d.id.name });
            }
          }
        }
        break;
      case 'BinaryExpression':
        if (n.operator === '==' || n.operator === '!=') diag('SJS-L003', n.span);
        break;
      case 'ForInStatement': diag('SJS-L004', n.span); break;
      case 'DebuggerStatement': diag('SJS-L005', n.span); break;
      case 'MatchExpression': {
        if (n.arms.length === 0) { diag('SJS-L006', n.span); break; }
        const seen = new Set<string>();
        for (const arm of n.arms) {
          const v = variantName(arm.pattern);
          if (v === undefined) continue; // default arm — never redundant
          if (seen.has(v)) diag('SJS-L007', arm.span, { variant: v });
          else seen.add(v);
        }
        break;
      }
      case 'CallExpression':
        for (const arg of n.args) {
          if (arg.kind === 'FunctionExpression' && !arg.generator && !arg.id) {
            diag('SJS-L008', arg.span);
          }
        }
        break;
    }
  });

  out.sort((a, b) => a.span.start.offset - b.span.start.offset);
  return out;
}

/** Names that are reassigned anywhere (assignment target or `++`/`--` operand). */
function collectReassigned(program: Program): Set<string> {
  const names = new Set<string>();
  walk(program, (n) => {
    if (n.kind === 'AssignmentExpression') addTargetNames(n.left as Expression | Pattern, names);
    else if (n.kind === 'UpdateExpression' && n.argument.kind === 'Identifier') names.add(n.argument.name);
  });
  return names;
}

/**
 * Collect rebound identifier names from an assignment/destructuring target. A
 * destructuring LHS may parse as patterns (`ArrayPattern`) or as the equivalent
 * literal (`ArrayLiteral`) depending on context, so both shapes are covered.
 */
function addTargetNames(node: Expression | Pattern, out: Set<string>): void {
  switch (node.kind) {
    case 'Identifier': out.add(node.name); break;
    case 'ArrayPattern':
      for (const el of node.elements) if (el) addTargetNames(el, out);
      break;
    case 'ArrayLiteral':
      for (const el of node.elements) if (el) addTargetNames(el, out);
      break;
    case 'ObjectPattern':
      for (const p of node.properties) {
        if (p.kind === 'RestElement') out.add(p.argument.name);
        else addTargetNames(p.value, out);
      }
      break;
    case 'ObjectLiteral':
      for (const p of node.properties) {
        if (p.kind === 'PropertyDef') addTargetNames(p.value, out);
        else if (p.kind === 'SpreadElement') addTargetNames(p.argument, out);
      }
      break;
    case 'AssignmentPattern': addTargetNames(node.left, out); break;
    case 'SpreadElement': addTargetNames(node.argument, out); break;
    case 'ParenthesizedExpression': addTargetNames(node.expression, out); break;
    // MemberExpression (`a.b = …`) rebinds a property, not the binding — ignore.
  }
}

/** The variant tag of a match pattern, or undefined for the default pattern. */
function variantName(p: MatchPattern): string | undefined {
  switch (p.kind) {
    case 'TupleVariantPattern':
    case 'RecordVariantPattern':
    case 'UnitVariantPattern':
      return p.variant.name;
    default:
      return undefined; // DefaultPattern
  }
}

/** Generic depth-first walk over every AST node (object with a string `kind`). */
function walk(node: unknown, visit: (n: Node) => void): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const el of node) walk(el, visit); return; }
  const obj = node as Record<string, unknown>;
  if (typeof obj['kind'] === 'string') visit(obj as unknown as Node);
  for (const key of Object.keys(obj)) {
    if (key === 'kind' || key === 'span') continue;
    walk(obj[key], visit);
  }
}
