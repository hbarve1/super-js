# compiler/ — Agent Context

This is the **Phase 2 plain-JS compiler** for SuperJS. It is written in vanilla JavaScript (no TypeScript, no Babel dependency) and serves as a correctness reference against the Babel-based prototype in `backends/prototype/`.

Read `specs/mission.md` for project goals. Read `specs/error-codes.md` for the canonical list of diagnostic codes before touching anything that emits diagnostics.

---

## Phase 1 vs Phase 2

| | Phase 1 (`backends/prototype/`) | Phase 2 (`compiler/`) |
|---|---|---|
| Language | TypeScript + Babel | Plain JavaScript (CommonJS) |
| Parser | Babel parser | Hand-written recursive-descent |
| Purpose | Production CLI, reference impl | Correctness check against prototype |
| Status | Feature-complete | In progress — lexer + parser complete, type-checker skeletal |

Both implementations must agree on diagnostic codes and error locations. When the prototype emits `SJS-E001`, the compiler must emit the same code for the same input.

---

## Directory layout

```
compiler/
├── src/
│   ├── keywords/
│   │   └── index.js               # Keyword/reserved-word tables
│   ├── lexer/
│   │   ├── lexer.js               # Main Lexer class
│   │   ├── lexer.test.js          # Unit tests for Lexer
│   │   ├── sample-sjs.test.js     # Integration test over sample.sjs
│   │   ├── sample.sjs             # Sample SJS input for integration tests
│   │   └── libs/
│   │       ├── char-stream.js     # Character-level stream abstraction
│   │       ├── comments.js        # Comment skipping helpers
│   │       ├── number.js          # Numeric literal scanning
│   │       ├── operators.js       # Operator scanning
│   │       ├── string.js          # String literal scanning
│   │       ├── template.js        # Template literal scanning
│   │       ├── token-types.js     # Token type constants
│   │       └── token.js           # Token data class
│   ├── parser/
│   │   ├── parser.js              # Main Parser class (entry point)
│   │   ├── print-ast.js           # AST pretty-printer for debugging
│   │   ├── PARSER_PROGRESS.md     # What the parser handles so far
│   │   └── libs/
│   │       ├── block/             # BlockStatement
│   │       ├── classes/           # ClassDeclaration, MethodDefinition
│   │       ├── conditionals/      # if/switch with error recovery
│   │       ├── controlflow/       # break/continue/return/throw
│   │       ├── export/            # export declarations
│   │       ├── expressions/       # BinaryExpression, operator precedence
│   │       ├── functions/         # FunctionDeclaration, params, generics
│   │       ├── import/            # import declarations
│   │       ├── loops/             # for/while/do-while
│   │       ├── patterns/          # array/object destructuring patterns
│   │       ├── program/           # Program (top-level entry point)
│   │       ├── statements/        # Statement dispatch
│   │       ├── try/               # try/catch/finally with error recovery
│   │       ├── types/             # Type annotation parsing
│   │       └── variables/         # var/let/const declarations
│   ├── type-checker/
│   │   ├── index.js               # Re-exports TypeChecker
│   │   ├── type-checker.js        # TypeChecker class (skeletal — expand here)
│   │   └── type-checker.test.js   # Unit tests
│   └── utils/
│       ├── ast-node-types.js      # Node type string constants
│       └── parser.js              # Shared parser utility helpers
├── package.json                   # npm scripts, Jest config
└── README.md
```

---

## How to run tests

All commands run from `compiler/`:

```bash
# Run all tests
npm test

# Focused suites
npm run test:lexer
npm run test:lexer:sample
npm run test:type-checker

# Single file with Jest directly
npx jest src/type-checker/type-checker.test.js
```

Tests use Jest with no transpilation (plain CommonJS). Every `*.test.js` in `src/` is picked up automatically.

---

## How to add a new type-checker rule

The type-checker lives entirely in `compiler/src/type-checker/type-checker.js`. It is a single class called `TypeChecker` that walks the AST produced by the parser.

### Step 1 — Identify the relevant AST node type

Look at `src/utils/ast-node-types.js` for the canonical node type strings. The parser emits nodes like `VariableDeclaration`, `FunctionDeclaration`, `BinaryExpression`, etc.

### Step 2 — Add a dispatch case in `checkNode`

```js
checkNode(node) {
  switch (node.type) {
    case 'VariableDeclaration':
      this.checkVariableDeclaration(node)
      break
    // Add your new case here:
    case 'AssignmentExpression':
      this.checkAssignment(node)
      break
    default:
      break
  }
}
```

### Step 3 — Implement the check method

```js
checkAssignment(node) {
  const { left, right } = node
  const leftType = this.env[left.name] || 'any'
  const rightType = this.inferType(right)
  if (leftType !== 'any' && rightType !== leftType) {
    throw new Error(`Type error: cannot assign ${rightType} to ${leftType} [SJS-E002]`)
  }
}
```

The current pattern throws on errors. When the type-checker is refactored to collect `PrototypeDiagnostic` objects (matching the prototype model), update the error path to push a diagnostic instead of throwing.

### Step 4 — Use the correct diagnostic code

Diagnostic codes are in `specs/error-codes.md`. Use the exact form `SJS-E001`, `SJS-W001`, etc. Never invent a new code without first reserving it in that file.

### Step 5 — Write a test

Add to `src/type-checker/type-checker.test.js`:

```js
const Parser = require('../parser/parser')
const Lexer = require('../lexer/lexer')
const { TypeChecker } = require('./index')

describe('SJS-EXXX: your rule description', () => {
  test('catches the violation', () => {
    const code = 'let x: number = "wrong";'
    const lexer = new Lexer(code)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens)
    const ast = parser.parse()
    const checker = new TypeChecker()
    expect(() => checker.check(ast)).toThrow(/Type error/)
  })

  test('accepts the valid form', () => {
    const code = 'let x: number = 42;'
    const lexer = new Lexer(code)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens)
    const ast = parser.parse()
    const checker = new TypeChecker()
    expect(() => checker.check(ast)).not.toThrow()
  })
})
```

---

## How to add a new diagnostic code

1. **Reserve the code** in `specs/error-codes.md`. Pick the next available number in the correct category (`E`, `W`, `L`, `P`). Do not skip numbers.
2. **Create the spec file** at `specs/error-codes/SJS-EXXX.md`. Copy `specs/error-codes/_template.md` (or model after an existing file like `SJS-E001.md`). Fill in: severity, category, stage, description, example, fix, related codes.
3. **Emit the code** in `type-checker.js`. Include the code string in the thrown error message or diagnostic object.
4. **Write a test** — see pattern above.
5. **Update `specs/language/060-error-codes-map.md`** — add the mapping from feature → code.

---

## Key invariants — do not break

1. **Diagnostic codes are permanent.** Once a code is in `specs/error-codes.md`, its number is never reused. Retired codes stay in the Retired section with their number reserved.
2. **Parity with the prototype.** For any `.sjs` input, this compiler and `backends/prototype/` must emit the same set of diagnostic codes at the same locations. Before adding a rule here, check `backends/prototype/src/typeChecker/index.ts` for how the prototype handles the same case.
3. **No TypeScript or Babel.** This compiler is plain CommonJS JavaScript. Do not `require('@babel/types')` or `import` TypeScript here.
4. **Tests must pass before merging.** Run `npm test` from `compiler/` and confirm zero failures.
5. **Use `src/utils/ast-node-types.js` constants.** Do not compare `node.type` to raw strings that aren't in that file — add constants there if needed.
