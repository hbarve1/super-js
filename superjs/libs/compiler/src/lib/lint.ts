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
 * - **L009 no-unused-import** — an import binding never referenced anywhere
 *   (value, type, or JSX position) outside the import statement itself.
 * - **L010 import-order** — within a contiguous block of imports, the source
 *   specifiers must be sorted ascending.
 * - **L012 no-unused-var** — a non-exported top-level binding (const/let/var,
 *   function, class) referenced nowhere else in the module.
 * - **L013 no-explicit-dynamic** — an explicit `dynamic` type annotation; add a
 *   `// @sjs:dynamic-ok` comment on the line (or the line above) to opt out.
 * - **L014 no-shadowing** — a binding whose name shadows one from an enclosing
 *   scope (function, block, `for`, or `catch`).
 *
 * `prefer-const` and `no-unused-import` are name-based and conservative: any
 * occurrence of the name (in any scope, value or type position) suppresses the
 * finding, so shadowing never produces a false positive.
 */

import type {
  Program, Diagnostic, DiagnosticCode, Span, Position, Expression, Pattern, Node,
  MatchPattern, Identifier, DiagnosticFix,
} from '@superjs/types';
import { parse } from '@superjs/parser';
import { createDiagnostic, type MessageParams } from '@superjs/diagnostics';

/** Lint source. Parse errors are returned alongside any lint findings. */
export function lint(source: string, file?: string): Diagnostic[] {
  const { program, diagnostics } = parse(source, { file });
  const out: Diagnostic[] = diagnostics.filter((d) => d.severity === 'error').map((d) => ({ ...d }));

  const reassigned = collectReassigned(program);
  const usedNames = collectUsedNames(program);
  const lines = source.split('\n');
  // L013 opt-out: `@sjs:dynamic-ok` on the annotation's line or the line above.
  const dynamicOptedOut = (span: Span): boolean => {
    const li = span.start.line - 1;
    return (lines[li] ?? '').includes('@sjs:dynamic-ok')
      || (lines[li - 1] ?? '').includes('@sjs:dynamic-ok');
  };
  const diag = (code: DiagnosticCode, span: Span, params?: MessageParams, fixes?: readonly DiagnosticFix[]): void => {
    out.push(createDiagnostic({
      code, span,
      ...(file !== undefined ? { file } : {}),
      ...(params ? { params } : {}),
      ...(fixes ? { fixes } : {}),
    }));
  };

  walk(program, (n) => {
    switch (n.kind) {
      case 'VariableDecl':
        if (n.declKind === 'var') {
          // Auto-fix: rewrite the leading `var` keyword to `let`.
          diag('SJS-L002', n.span, undefined, [{
            description: 'Replace `var` with `let`',
            edits: [{ span: tokenSpan(n.span.start, 3), newText: 'let' }],
          }]);
          break;
        }
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
      case 'DebuggerStatement':
        // Auto-fix: delete the statement.
        diag('SJS-L005', n.span, undefined, [{ description: 'Remove `debugger`', edits: [{ span: n.span, newText: '' }] }]);
        break;
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
      case 'ImportDecl':
        for (const b of importBindings(n)) {
          if (!usedNames.has(b.name)) diag('SJS-L009', b.span, { name: b.name });
        }
        break;
      case 'PrimitiveTypeNode':
        if (n.name === 'dynamic' && !dynamicOptedOut(n.span)) diag('SJS-L013', n.span);
        break;
    }
  });

  // L010 import-order: within a run of adjacent imports, sources sort ascending.
  let prevSource: string | undefined;
  for (const stmt of program.body) {
    if (stmt.kind !== 'ImportDecl') { prevSource = undefined; continue; }
    const src = stmt.source.value;
    if (prevSource !== undefined && src.localeCompare(prevSource) < 0) {
      diag('SJS-L010', stmt.span, { source: src });
    }
    prevSource = src;
  }

  // L014 no-shadowing: a binding that shadows a name from an enclosing scope.
  for (const s of findShadowing(program)) diag('SJS-L014', s.span, { name: s.name });

  // L012 no-unused-var: a non-exported top-level binding referenced nowhere else.
  const offsets = collectIdentifierOffsets(program);
  for (const decl of topLevelBindings(program)) {
    const seen = offsets.get(decl.id.name);
    const usedElsewhere = seen?.some((o) => o !== decl.id.span.start.offset) ?? false;
    if (!usedElsewhere) diag('SJS-L012', decl.id.span, { name: decl.id.name });
  }

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

/** A span covering `len` characters from `start` (a single-line keyword token). */
function tokenSpan(start: Position, len: number): Span {
  return { start, end: { offset: start.offset + len, line: start.line, column: start.column + len } };
}

/** The local binding identifiers introduced by an import declaration. */
function importBindings(n: Extract<Node, { kind: 'ImportDecl' }>): Identifier[] {
  const out: Identifier[] = [];
  if (n.defaultImport) out.push(n.defaultImport);
  if (n.namespaceImport) out.push(n.namespaceImport);
  for (const s of n.named) out.push(s.local);
  return out;
}

/**
 * Every identifier name referenced outside import declarations — value, JSX, and
 * type positions (`TypeRefNode` carries dotted string segments, not identifier
 * nodes, so those are collected explicitly). Used to detect unused imports;
 * over-collection only ever suppresses a finding, never invents one.
 */
function collectUsedNames(program: Program): Set<string> {
  const used = new Set<string>();
  const visit = (n: Node): void => {
    if (n.kind === 'Identifier') used.add(n.name);
    else if (n.kind === 'TypeRefNode') for (const seg of n.name) used.add(seg);
  };
  for (const stmt of program.body) {
    if (stmt.kind === 'ImportDecl') continue; // bindings here are declarations, not uses
    walk(stmt, visit);
  }
  return used;
}

/**
 * Non-exported top-level bindings (const/let/var with an identifier name,
 * function, class). Exported declarations are part of the module's API, so they
 * are never "unused". Destructuring binders are skipped (conservative).
 */
function topLevelBindings(program: Program): { id: Identifier }[] {
  const out: { id: Identifier }[] = [];
  for (const stmt of program.body) {
    if (stmt.kind === 'ExportNamedDecl' || stmt.kind === 'ExportDefaultDecl' || stmt.kind === 'ExportAllDecl') continue;
    if (stmt.kind === 'VariableDecl') {
      for (const d of stmt.declarators) if (d.id.kind === 'Identifier') out.push({ id: d.id });
    } else if (stmt.kind === 'FunctionDecl' || stmt.kind === 'ClassDecl') {
      out.push({ id: stmt.id });
    }
  }
  return out;
}

/** Every identifier name mapped to the source offsets at which it appears. */
function collectIdentifierOffsets(program: Program): Map<string, number[]> {
  const map = new Map<string, number[]>();
  walk(program, (n) => {
    if (n.kind !== 'Identifier') return;
    const list = map.get(n.name);
    if (list) list.push(n.span.start.offset);
    else map.set(n.name, [n.span.start.offset]);
  });
  return map;
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

/**
 * L014 no-shadowing: a binding whose name already exists in an enclosing scope.
 * A scope-aware traversal — scopes are created by functions (params + body
 * share one), standalone blocks, `for` loops, and `catch`. Only outer scopes are
 * consulted, so a redeclaration in the *same* scope is not a shadow.
 */
function findShadowing(program: Program): { name: string; span: Span }[] {
  const found: { name: string; span: Span }[] = [];
  const stack: Set<string>[] = [];

  const declare = (name: string, span: Span): void => {
    if (stack.slice(0, -1).some((s) => s.has(name))) found.push({ name, span });
    stack[stack.length - 1]!.add(name);
  };
  const declarePattern = (node: Node): void => {
    for (const b of bindingNames(node)) declare(b.name, b.span);
  };

  const visit = (node: Node): void => {
    switch (node.kind) {
      case 'FunctionDecl':
        declare(node.id.name, node.id.span);
        return visitFunction(node);
      case 'FunctionExpression':
      case 'ArrowFunction':
        return visitFunction(node);
      case 'ClassDecl':
        declare(node.id.name, node.id.span);
        return recurseChildren(node, ['id']);
      case 'BlockStatement':
        stack.push(new Set());
        for (const s of node.body) visit(s);
        stack.pop();
        return;
      case 'ForStatement':
        stack.push(new Set());
        if (node.init) visit(node.init as Node);
        if (node.test) visit(node.test);
        if (node.update) visit(node.update);
        visit(node.body);
        stack.pop();
        return;
      case 'ForOfStatement':
        stack.push(new Set());
        declarePattern(node.left as Node);
        visit(node.right);
        visit(node.body);
        stack.pop();
        return;
      case 'ForInStatement':
        stack.push(new Set());
        declare(node.left.name, node.left.span);
        visit(node.right);
        visit(node.body);
        stack.pop();
        return;
      case 'CatchClause':
        stack.push(new Set());
        if (node.param) declare(node.param.name, node.param.span);
        for (const s of node.body.body) visit(s);
        stack.pop();
        return;
      case 'VariableDecl':
        for (const d of node.declarators) {
          declarePattern(d.id as Node);
          if (d.init) visit(d.init);
        }
        return;
      case 'Identifier':
        return;
      default:
        return recurseChildren(node);
    }
  };

  const visitFunction = (fn: Extract<Node, { kind: 'FunctionDecl' | 'FunctionExpression' | 'ArrowFunction' }>): void => {
    stack.push(new Set());
    for (const p of fn.params) declarePattern(p.pattern as Node);
    if (fn.body.kind === 'BlockStatement') for (const s of fn.body.body) visit(s); // params + body share one scope
    else visit(fn.body);
    stack.pop();
  };

  const recurseChildren = (node: Node, skip: string[] = []): void => {
    for (const key of Object.keys(node)) {
      if (key === 'kind' || key === 'span' || skip.includes(key)) continue;
      const v = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(v)) { for (const e of v) if (isAstNode(e)) visit(e as Node); }
      else if (isAstNode(v)) visit(v as Node);
    }
  };

  stack.push(new Set()); // program scope
  for (const s of program.body) visit(s);
  return found;
}

function isAstNode(v: unknown): v is Node {
  return typeof v === 'object' && v !== null && typeof (v as { kind?: unknown }).kind === 'string';
}

/** Binding names + spans introduced by a pattern (or destructuring literal). */
function bindingNames(node: Node): { name: string; span: Span }[] {
  const out: { name: string; span: Span }[] = [];
  const rec = (n: Node): void => {
    switch (n.kind) {
      case 'Identifier': out.push({ name: n.name, span: n.span }); break;
      case 'ArrayPattern': for (const el of n.elements) if (el) rec(el as Node); break;
      case 'ArrayLiteral': for (const el of n.elements) if (el) rec(el as Node); break;
      case 'ObjectPattern':
        for (const p of n.properties) {
          if (p.kind === 'RestElement') rec(p.argument as Node);
          else rec(p.value as Node);
        }
        break;
      case 'ObjectLiteral':
        for (const p of n.properties) {
          if (p.kind === 'PropertyDef') rec(p.value as Node);
          else if (p.kind === 'SpreadElement') rec(p.argument as Node);
        }
        break;
      case 'AssignmentPattern': rec(n.left as Node); break;
      case 'RestElement': rec(n.argument as Node); break;
      case 'ParenthesizedExpression': rec(n.expression as Node); break;
    }
  };
  rec(node);
  return out;
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
