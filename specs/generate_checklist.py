#!/usr/bin/env python3
"""
Generate ECMAScript → SJS implementation checklist as Excel workbook.
Each ECMA-262 section becomes a worksheet.
Columns: Feature | ECMA-262 Ref | Status | SJS Notes
Status values: ✅ Done | 🟡 Partial | ❌ Missing
"""

import xlsxwriter

DONE    = "✅ Done"
PARTIAL = "🟡 Partial"
MISSING = "❌ Missing"

# ── Data ──────────────────────────────────────────────────────────────────────
# Each entry: (feature, spec_ref, status, notes)

SECTIONS = {

  "§6 — Data Types & Values": [
    ("Undefined type",              "§6.1.1",  DONE,    "T_UNDEFINED constant"),
    ("Null type",                   "§6.1.2",  DONE,    "T_NULL constant"),
    ("Boolean type",                "§6.1.3",  DONE,    "T_BOOLEAN constant"),
    ("String type",                 "§6.1.4",  DONE,    "T_STRING constant"),
    ("Symbol type",                 "§6.1.5",  DONE,    "T_SYMBOL constant"),
    ("Number type",                 "§6.1.6.1",DONE,    "T_NUMBER constant"),
    ("BigInt type",                 "§6.1.6.2",DONE,    "T_BIGINT; SJS-E004 on mixed arithmetic"),
    ("Object type",                 "§6.1.7",  DONE,    "ObjectType with properties map"),
    ("dynamic type (SJS extension)","SJS",     DONE,    "T_DYNAMIC; consistent with all types"),
    ("never type",                  "TS/SJS",  DONE,    "T_NEVER; bottom type"),
    ("void type",                   "TS/SJS",  DONE,    "T_VOID; function returns nothing"),
    ("any type (gradual)",          "Gradual",  DONE,   "T_ANY; consistent with all types"),
  ],

  "§12 — Lexical Grammar": [
    ("Numeric literals (integer)",      "§12.9.3",  DONE,    "NumericLiteral → T_NUMBER"),
    ("Numeric literals (float)",        "§12.9.3",  DONE,    "NumericLiteral → T_NUMBER"),
    ("Numeric literals (hex/oct/bin)",  "§12.9.3",  DONE,    "NumericLiteral → T_NUMBER"),
    ("Numeric separators (1_000)",      "§12.9.3",  DONE,    "Babel parses; T_NUMBER"),
    ("BigInt literals (42n)",           "§12.9.3",  DONE,    "BigIntLiteral → T_BIGINT"),
    ("String literals (single/double)", "§12.9.4",  DONE,    "StringLiteral → T_STRING"),
    ("Template literals (backtick)",    "§12.9.5",  DONE,    "TemplateLiteral → T_STRING"),
    ("Tagged template literals",        "§12.9.5",  DONE,    "TaggedTemplateExpression → infers tag fn return type; String.raw→string"),
    ("RegExp literals (/pat/flags)",    "§12.9.8",  DONE,    "RegExpLiteral → ObjectType{brand:RegExp}"),
    ("null literal",                    "§12.9.2",  DONE,    "NullLiteral → T_NULL"),
    ("Boolean literals (true/false)",   "§12.9.1",  DONE,    "BooleanLiteral → T_BOOLEAN"),
    ("Identifiers / reserved words",    "§12.7",    DONE,    "Identifier lookup in TypeEnvironment"),
  ],

  "§13 — Expressions": [
    # Literals
    ("Array initializer []",            "§13.2.4",  DONE,    "ArrayExpression; element type inference"),
    ("Object initializer {}",           "§13.2.5",  DONE,    "ObjectExpression; properties + shorthand methods typed"),
    ("Object shorthand methods",        "§13.2.5",  DONE,    "ObjectMethod → FunctionType in ObjectType"),
    ("Object computed property keys",   "§13.2.5",  DONE,    "Literal [str/num] computed keys registered by value; dynamic keys set __indexType"),
    ("Object getter/setter literals",   "§13.2.5",  DONE,    "ObjectMethod get → return type; set → param type"),
    ("Spread in array literal [...x]",  "§13.2.4",  DONE,    "SpreadElement in ArrayExpression; infers elem type from spread source"),
    ("Spread in object literal {...o}", "§13.2.5",  DONE,    "SpreadElement in ObjectExpression; merges source properties"),
    # Member access
    ("Static member access obj.prop",   "§13.3.2",  DONE,    "MemberExpression static"),
    ("Computed member access obj[x]",   "§13.3.2",  DONE,    "MemberExpression computed"),
    ("Optional chaining obj?.prop",     "§13.5.1",  DONE,    "OptionalMemberExpression"),
    ("Optional call fn?.()",            "§13.5.1",  DONE,    "OptionalCallExpression → result|undefined"),
    ("Optional computed obj?.[x]",      "§13.5.1",  DONE,    "OptionalMemberExpression computed"),
    # Calls
    ("Function call fn()",              "§13.3.6",  DONE,    "CallExpression; arg type checking"),
    ("Method call obj.method()",        "§13.3.6",  DONE,    "stdlib dispatch + object property lookup"),
    ("new Constructor()",               "§13.3.5",  DONE,    "NewExpression; stdlib + user constructors"),
    ("super(args) in constructor",      "§13.3.7",  DONE,    "Super → T_ANY; no false errors"),
    ("super.method()",                  "§13.3.7",  DONE,    "Super member → T_ANY; no false errors"),
    ("import() dynamic",                "§13.3.11", DONE,    "ImportExpression → Promise<any>; module types not resolved in single-file mode"),
    ("import.meta",                     "§13.3.12", DONE,    "MetaProperty → {url:string,...}"),
    ("new.target",                      "§13.3.12", DONE,    "MetaProperty → fn|undefined"),
    # Update/unary
    ("Prefix ++ --",                    "§13.4.2",  DONE,    "UpdateExpression; number|bigint"),
    ("Postfix ++ --",                   "§13.4.4",  DONE,    "UpdateExpression postfix"),
    ("delete operator",                 "§13.5.1",  DONE,    "UnaryExpression delete → T_BOOLEAN"),
    ("void operator",                   "§13.5.3",  DONE,    "UnaryExpression void → T_UNDEFINED"),
    ("typeof operator",                 "§13.5.4",  DONE,    "UnaryExpression typeof → T_STRING"),
    ("Unary + -",                       "§13.5.5",  DONE,    "UnaryExpression +/- → number/bigint"),
    ("Logical NOT !",                   "§13.5.7",  DONE,    "UnaryExpression ! → boolean"),
    ("Bitwise NOT ~",                   "§13.5.6",  DONE,    "UnaryExpression ~ → number"),
    # Binary
    ("Exponentiation **",               "§13.6",    DONE,    "BinaryExpression ** → number|bigint"),
    ("Multiplicative * / %",            "§13.7",    DONE,    "BinaryExpression"),
    ("Additive + -",                    "§13.8",    DONE,    "BinaryExpression; string concat detected"),
    ("Bitwise shift << >> >>>",         "§13.9",    DONE,    "BinaryExpression bitwise"),
    ("Relational < > <= >=",            "§13.10",   DONE,    "BinaryExpression relational → boolean"),
    ("in operator",                     "§13.10",   DONE,    "BinaryExpression 'in' → boolean; PrivateName brand check → boolean"),
    ("instanceof operator",             "§13.10",   DONE,    "Returns boolean; extractNarrowings narrows x to branded ObjectType via classFieldTypes"),
    ("Equality == !== === !==",         "§13.11",   DONE,    "BinaryExpression equality → boolean"),
    ("Bitwise AND & OR | XOR ^",        "§13.12",   DONE,    "BinaryExpression bitwise"),
    ("Logical AND &&",                  "§13.13",   DONE,    "LogicalExpression"),
    ("Logical OR ||",                   "§13.13",   DONE,    "LogicalExpression"),
    ("Nullish coalescing ??",           "§13.13",   DONE,    "LogicalExpression ?? → T|U narrowing"),
    # Conditional / assignment
    ("Ternary a ? b : c",              "§13.14",   DONE,    "ConditionalExpression → union(b,c)"),
    ("Assignment =",                    "§13.15",   DONE,    "AssignmentExpression → RHS type"),
    ("Compound assign += -= *= /= %= **=","§13.15", DONE,    "AssignmentExpression compound"),
    ("Logical assign &&= ||= ??=",      "§13.15",   DONE,    "AssignmentExpression logical"),
    ("Bitwise assign &= |= ^= <<= >>= >>>=","§13.15",DONE,   "AssignmentExpression bitwise compound"),
    ("Destructuring assign {a}=obj",    "§13.15",   DONE,    "ObjectPattern in AssignmentExpression; updates bindings from source ObjectType properties"),
    ("Destructuring assign [a]=arr",    "§13.15",   DONE,    "ArrayPattern in AssignmentExpression; updates bindings from array/tuple element types"),
    ("Spread in assignment ...rest",    "§13.15",   DONE,    "ObjectPattern rest → source ObjectType minus extracted keys; ArrayPattern rest → source ArrayType"),
    # Other
    ("Comma operator a, b",             "§13.16",   DONE,    "SequenceExpression → last type"),
    ("await expression",                "§13.16",   DONE,    "AwaitExpression; unwraps Promise<T>"),
    ("yield expression",                "§13.5",    DONE,    "yield x validated against Generator<Y,R,N> declared yield type (SJS-E006)"),
    ("yield* delegation",               "§13.5",    DONE,    "yield* skips value-type check (delegates to iterable); gradual"),
    ("Type cast x as T",                "TS",       DONE,    "TSAsExpression → T"),
    ("Type assertion <T>x",             "TS",       DONE,    "TSTypeAssertion → T"),
    ("satisfies operator",              "TS4.9",    DONE,    "TSSatisfiesExpression"),
    ("Non-null assertion x!",           "TS",       DONE,    "TSNonNullExpression → SJS-E006 (banned)"),
  ],

  "§14 — Statements & Declarations": [
    ("Block statement {}",              "§14.2",    DONE,    "BlockStatement; push/pop scope"),
    ("const declaration",               "§14.3.2",  DONE,    "VariableDeclaration kind=const"),
    ("let declaration",                 "§14.3.2",  DONE,    "VariableDeclaration kind=let; block scoped"),
    ("var declaration",                 "§14.3.2",  DONE,    "VariableDeclaration kind=var; fn scoped"),
    ("Array destructuring const [a,b]", "§14.3.3",  DONE,    "ArrayPattern in VariableDeclarator"),
    ("Object destructuring const {a}",  "§14.3.3",  DONE,    "ObjectPattern in VariableDeclarator"),
    ("Nested destructuring",            "§14.3.3",  DONE,    "ObjectPattern/ArrayPattern nested; default values via AssignmentPattern"),
    ("Destructuring with defaults {x=1}","§14.3.3", DONE,    "AssignmentPattern default in ObjectPattern"),
    ("Computed destructuring {[k]:v}",  "§14.3.3",  DONE,    "Literal computed keys resolved; dynamic computed keys give binding T_ANY (gradual)"),
    ("Rest in array destructure [...r]","§14.3.3",  DONE,    "RestElement in ArrayPattern → T_ANY bound"),
    ("Rest in object destructure {...r}","§14.3.3",  DONE,    "RestElement in ObjectPattern → T_ANY bound"),
    ("Empty statement ;",               "§14.4",    DONE,    "No-op; no type check needed"),
    ("Expression statement",            "§14.5",    DONE,    "ExpressionStatement; checks call/assign"),
    ("if / else",                       "§14.6",    DONE,    "IfStatement with type narrowing"),
    ("switch statement",                "§14.12",   DONE,    "SwitchStatement + exhaustiveness SJS-E007"),
    ("while loop",                      "§14.7.3",  DONE,    "WhileStatement"),
    ("do...while loop",                 "§14.7.4",  DONE,    "DoWhileStatement"),
    ("for loop",                        "§14.7.4",  DONE,    "ForStatement"),
    ("for...in loop",                   "§14.7.5",  DONE,    "ForInStatement; key: string"),
    ("for...of loop",                   "§14.7.5",  DONE,    "ForOfStatement; element type from array/iterable"),
    ("for await...of loop",             "§14.7.5",  DONE,    "ForOfStatement await; AsyncGenerator<T> yieldType extracted correctly"),
    ("break statement",                 "§14.8",    DONE,    "No type check needed"),
    ("continue statement",              "§14.9",    DONE,    "No type check needed"),
    ("return statement",                "§14.10",   DONE,    "ReturnStatement; checks against fn return type"),
    ("throw statement",                 "§14.14",   DONE,    "ThrowStatement; allows any throwable"),
    ("try/catch/finally",               "§14.15",   DONE,    "TryStatement; catch: unknown"),
    ("Optional catch binding",          "§14.15",   DONE,    "CatchClause without param"),
    ("Labeled statement label:",        "§14.11",   DONE,    "LabeledStatement silently traversed; no false errors"),
    ("break label / continue label",    "§14.8/9",  DONE,    "BreakStatement/ContinueStatement label silently handled"),
    ("with statement (legacy)",         "§14.11",   PARTIAL, "WithStatement not handled; low priority (strict mode bans it)"),
    ("debugger statement",              "§14.16",   DONE,    "No type check needed"),
  ],

  "§15 — Functions & Classes": [
    # Functions
    ("Function declaration",            "§15.2",    DONE,    "FunctionDeclaration → registered in env"),
    ("Function expression",             "§15.2",    DONE,    "FunctionExpression → FunctionType"),
    ("Arrow function (concise body)",   "§15.3",    DONE,    "ArrowFunctionExpression → infers return"),
    ("Arrow function (block body)",     "§15.3",    DONE,    "ArrowFunctionExpression → checks return"),
    ("Default parameters fn(x=5)",      "§15.2",    DONE,    "AssignmentPattern param; type annotation on left-side tracked; binding registered in body"),
    ("Rest parameters fn(...args)",     "§15.2",    DONE,    "RestElement in params; type annotation → array type; without annotation → T_ANY[]"),
    ("Spread in call fn(...arr)",       "§13.3.8",  DONE,    "SpreadElement: skips arity check; checks element type against param type"),
    ("Named function parameters",       "§15.2",    DONE,    "Identifier params with type annotations"),
    ("Destructured parameters {a,b}",   "§15.2",    DONE,    "ObjectPattern/ArrayPattern params with type annotation → property types registered in body"),
    ("Optional parameters fn(x?)",      "TS",       DONE,    "param.optional flag tracked"),
    ("Async function",                  "§15.8",    DONE,    "async: wraps return in Promise<T>"),
    ("Generator function*",             "§15.5",    DONE,    "GeneratorType{yieldType,returnType,nextType,async}; for-of elem type inferred"),
    ("Async generator function*",       "§15.8",    DONE,    "GeneratorType{async:true}; yieldType from AsyncGenerator<T> annotation; for-await-of extracts correct type"),
    ("Function overloads",              "TS",       DONE,    "TSDeclareFunction signatures silently skipped; implementation signature registered for call checking (gradual)"),
    # Classes
    ("Class declaration",               "§15.7",    DONE,    "ClassDeclaration; member registration"),
    ("Class expression",                "§15.7",    DONE,    "ClassExpression named+anonymous; parent VariableDeclarator registers __instance__ for new expr"),
    ("Constructor method",              "§15.7",    DONE,    "constructor() tracked"),
    ("Instance methods",                "§15.7",    DONE,    "ClassMethod; return type checked"),
    ("Static methods",                  "§15.7",    DONE,    "ClassMethod static → registered in env as ClassName.method"),
    ("Instance properties",             "§15.7",    DONE,    "ClassProperty non-static; type inferred from annotation or initializer; stored in classFieldTypes"),
    ("Static fields",                   "§15.7",    DONE,    "ClassProperty static → registered in staticFieldTypes"),
    ("Private fields #field",           "§15.7",    DONE,    "#field registered in classFieldTypes; this.#field inferred"),
    ("Private methods #method()",       "§15.7",    DONE,    "#method registered in classRegistry as private"),
    ("Getters get x()",                 "§15.7",    DONE,    "ClassMethod kind='get' → return type registered as property type"),
    ("Setters set x(v)",                "§15.7",    DONE,    "ClassMethod kind='set' → param type registered as property type"),
    ("extends clause",                  "§15.7",    DONE,    "Superclass fields + members inherited via classFieldTypes + classRegistry"),
    ("super() constructor call",        "§15.7",    DONE,    "Super → T_ANY; no false errors"),
    ("super.method()",                  "§15.7",    DONE,    "Super member → T_ANY; no false errors"),
    ("implements clause (SJS)",         "SJS",      DONE,    "SJS-E012 on missing interface members"),
    ("pub/priv/prot modifiers (SJS)",   "SJS",      DONE,    "SJS-E011 visibility enforcement"),
    ("abstract class (TS)",             "TS",       DONE,    "TSDeclareMethod registered in classRegistry/classFieldTypes"),
    ("Class static blocks (static {})", "§15.7",    DONE,    "StaticBlock traversed without errors; vars scoped"),
    ("#field in obj brand check",       "§15.7",    DONE,    "BinaryExpression PrivateName 'in' → boolean"),
    ("Decorators @decorator",           "Stage 3",  DONE,    "Decorator nodes silently traversed; no false errors; decorator expressions typed normally"),
    ("Class auto-accessor (TC39)",      "Stage 3",  DONE,    "ClassAccessorProperty handled like ClassProperty; type inferred from annotation or initializer"),
  ],

  "§16 — Scripts & Modules": [
    ("import { x } from 'mod'",             "§16.2",  DONE,    "ImportDeclaration; named specifier"),
    ("import defaultExport from 'mod'",     "§16.2",  DONE,    "ImportDefaultSpecifier"),
    ("import * as ns from 'mod'",           "§16.2",  DONE,    "ImportNamespaceSpecifier → T_ANY registered in env"),
    ("import type { T } from 'mod'",        "TS",     DONE,    "SJS-E009 type-only import tracking"),
    ("export { x }",                        "§16.2",  DONE,    "ExportNamedDeclaration"),
    ("export default",                      "§16.2",  DONE,    "ExportDefaultDeclaration"),
    ("export * from 'mod'",                 "§16.2",  DONE,    "ExportAllDeclaration handled as no-op in single-file mode"),
    ("export type { T }",                   "TS",     DONE,    "Type-only export"),
    ("re-export { x } from 'mod'",          "§16.2",  DONE,    "ExportNamedDeclaration source; T_ANY (cross-module types not tracked in single-file mode)"),
    ("Dynamic import()",                    "§16.2",  DONE,    "ImportExpression → T_ANY (module resolution not available)"),
    ("Top-level await",                     "§16.2",  DONE,    "Valid in ES modules (ECMA-262 §16.2.2); SJS-E008 only inside sync functions"),
    ("import.meta.url",                     "§16.2",  DONE,    "MetaProperty → {url:string}"),
    ("import.meta.env (Vite/bundler)",      "bundler",DONE,    "import.meta → {url,...unknown}"),
  ],

  "§19 — Global Object": [
    ("undefined",           "§19.1",  DONE,    "Identifier undefined → T_UNDEFINED"),
    ("NaN",                 "§19.1",  DONE,    "Identifier NaN → T_NUMBER"),
    ("Infinity",            "§19.1",  DONE,    "Identifier Infinity → T_NUMBER"),
    ("globalThis",          "§19.1",  DONE,    "globalThis → {[key]:unknown}"),
    ("eval() (forbidden in SJS)", "§19.2", DONE,    "SJS-E013 emitted on any eval() call"),
    ("isFinite()",          "§19.2",  DONE,    "isFinite() → boolean via stdlib"),
    ("isNaN()",             "§19.2",  DONE,    "isNaN() → boolean"),
    ("parseFloat()",        "§19.2",  DONE,    "parseFloat() → number"),
    ("parseInt()",          "§19.2",  DONE,    "parseInt() → number"),
    ("decodeURI / encodeURI","§19.2", DONE,    "→ string"),
    ("decodeURIComponent / encodeURIComponent","§19.2",DONE,"→ string"),
    ("structuredClone()",   "§19.2",  DONE,    "→ T_ANY"),
    ("queueMicrotask()",    "§19.2",  DONE,    "→ T_VOID"),
  ],

  "§20 — Fundamental Objects": [
    # Object
    ("Object(value)",               "§20.1",  DONE,    "Object() call → object type"),
    ("Object.create(proto)",        "§20.1",  DONE,    "→ object"),
    ("Object.keys(obj)",            "§20.1",  DONE,    "→ string[]"),
    ("Object.values(obj)",          "§20.1",  DONE,    "→ any[]"),
    ("Object.entries(obj)",         "§20.1",  DONE,    "→ [string,any][]"),
    ("Object.assign(target,...src)","§20.1",  DONE,    "→ merges all source ObjectType properties into target type"),
    ("Object.fromEntries()",        "§20.1",  DONE,    "→ object"),
    ("Object.freeze()",             "§20.1",  DONE,    "→ same type as argument (preserves structure; no readonly flag yet)"),
    ("Object.hasOwn()",             "§20.1",  DONE,    "→ boolean"),
    ("Object.is()",                 "§20.1",  DONE,    "→ boolean"),
    ("Object.defineProperty()",     "§20.1",  DONE,    "→ object"),
    ("Object.getOwnPropertyNames()", "§20.1", DONE,    "→ string[]"),
    ("Object.getPrototypeOf()",     "§20.1",  DONE,    "→ T_ANY (gradual; prototype chain not tracked)"),
    ("Object.groupBy() ES2024",     "§20.1",  DONE,    "→ object"),
    ("Object.setPrototypeOf()",     "§20.1",  DONE,    "→ T_ANY"),
    ("Object.getOwnPropertyDescriptor()", "§20.1", DONE,    "→ T_ANY"),
    ("Object.prototype.toString()", "§20.1",  DONE,    "→ string via object method fallback"),
    ("Object.prototype.hasOwnProperty()", "§20.1", DONE,    "→ boolean via object method fallback"),
    # Function
    ("Function()",                  "§20.2",  DONE,    "Dynamic function constructor → T_ANY (NewExpression fallthrough)"),
    ("Function.prototype.call/apply/bind","§20.2",DONE,"call/apply→T_ANY; bind→FunctionType"),
    # Boolean
    ("Boolean(x)",                  "§20.3",  DONE,    "→ boolean"),
    # Symbol
    ("Symbol(desc)",                "§20.4",  DONE,    "Symbol() → symbol"),
    ("Symbol.for(key)",             "§20.4",  DONE,    "→ symbol"),
    ("Symbol.keyFor(sym)",          "§20.4",  DONE,    "→ string | undefined"),
    ("Symbol.iterator",             "§20.4",  DONE,    "Well-known symbol → symbol"),
    ("Symbol.asyncIterator",        "§20.4",  DONE,    "Well-known symbol → symbol"),
    ("Symbol.toPrimitive",          "§20.4",  DONE,    "Well-known symbol → symbol"),
    ("Symbol.hasInstance",          "§20.4",  DONE,    "Well-known symbol → symbol"),
    ("Symbol.toStringTag",          "§20.4",  DONE,    "Well-known symbol → symbol"),
    ("Symbol.species (deprecated)", "§20.4",  DONE,    "Well-known symbol → symbol"),
    # Error types
    ("new Error(msg, {cause})",     "§20.5",  DONE,    "→ {message,stack,cause}"),
    ("Error.isError() ES2025",      "§20.5",  DONE,    "→ boolean"),
    ("new TypeError()",             "§20.5",  DONE,    "→ Error object"),
    ("new RangeError()",            "§20.5",  DONE,    "→ Error object"),
    ("new SyntaxError()",           "§20.5",  DONE,    "→ Error object"),
    ("new ReferenceError()",        "§20.5",  DONE,    "→ Error object"),
    ("new EvalError()",             "§20.5",  DONE,    "→ Error object"),
    ("new URIError()",              "§20.5",  DONE,    "→ Error object"),
    ("AggregateError ES2021",       "§20.5",  DONE,    "→ Error object"),
    ("SuppressedError ES2024",      "§20.5",  DONE,    "→ Error object"),
    ("error.message",               "§20.5",  DONE,    "property in Error ObjectType"),
    ("error.stack",                 "§20.5",  DONE,    "property string|undefined"),
    ("error.cause ES2022",          "§20.5",  DONE,    "property unknown"),
  ],

  "§21 — Numbers & Dates": [
    # Number
    ("Number(x)",               "§21.1",  DONE,    "Number() → number"),
    ("Number.isNaN()",          "§21.1",  DONE,    "→ boolean"),
    ("Number.isFinite()",       "§21.1",  DONE,    "→ boolean"),
    ("Number.isInteger()",      "§21.1",  DONE,    "→ boolean"),
    ("Number.isSafeInteger()",  "§21.1",  DONE,    "→ boolean"),
    ("Number.parseFloat()",     "§21.1",  DONE,    "→ number"),
    ("Number.parseInt()",       "§21.1",  DONE,    "→ number"),
    ("Number.MAX_VALUE etc.",   "§21.1",  DONE,    "Static constants → number"),
    ("Number.EPSILON",          "§21.1",  DONE,    "→ number"),
    ("n.toFixed()",             "§21.1",  DONE,    "→ string"),
    ("n.toPrecision()",         "§21.1",  DONE,    "→ string"),
    ("n.toString(radix)",       "§21.1",  DONE,    "→ string"),
    # BigInt
    ("BigInt(n)",               "§21.2",  DONE,    "BigInt() → bigint"),
    ("BigInt.asIntN()",         "§21.2",  DONE,    "→ bigint"),
    ("BigInt.asUintN()",        "§21.2",  DONE,    "→ bigint"),
    ("bigint.toString()",       "§21.2",  DONE,    "→ string"),
    # Math
    ("Math.abs/floor/ceil/round/trunc","§21.3",DONE,"→ number"),
    ("Math.min/max",            "§21.3",  DONE,    "→ number"),
    ("Math.sqrt/cbrt/pow",      "§21.3",  DONE,    "→ number"),
    ("Math.random()",           "§21.3",  DONE,    "→ number"),
    ("Math.log/log2/log10",     "§21.3",  DONE,    "→ number"),
    ("Math.sin/cos/tan etc.",   "§21.3",  DONE,    "→ number"),
    ("Math.PI/E/LN2 etc.",      "§21.3",  DONE,    "constants → number"),
    ("Math.hypot()",            "§21.3",  DONE,    "→ number"),
    ("Math.sumPrecise() ES2025","§21.3",  DONE,    "→ number"),
    ("Math.f16round() ES2025",    "§21.3",  DONE,    "→ number; companion to Float16Array"),
    ("Math.clz32/imul/fround",  "§21.3",  DONE,    "→ number"),
    # Date
    ("new Date()",              "§21.4",  DONE,    "→ ObjectType{brand:Date}"),
    ("Date.now()",              "§21.4",  DONE,    "→ number"),
    ("Date.parse()",            "§21.4",  DONE,    "→ number"),
    ("Date.UTC()",              "§21.4",  DONE,    "→ number"),
    ("date.getFullYear/Month/Date/Day","§21.4",DONE,"→ number"),
    ("date.getHours/Minutes/Seconds","§21.4",DONE,"→ number"),
    ("date.getTime()",          "§21.4",  DONE,    "→ number"),
    ("date.toISOString()",      "§21.4",  DONE,    "→ string"),
    ("date.toLocaleDateString()","§21.4", DONE,    "→ string"),
    ("date.setFullYear/Month etc.","§21.4",DONE,   "→ number"),
    ("date.getTimezoneOffset()","§21.4",  DONE,    "→ number"),
    ("Temporal (Stage 3 proposal)","TC39",MISSING, "Not part of ES2025 yet"),
  ],

  "§22 — Text Processing": [
    # String
    ("String(x)",                   "§22.1",  DONE,    "String() → string"),
    ("String.fromCharCode()",       "§22.1",  DONE,    "→ string via inferStdlibMethodCall"),
    ("String.fromCodePoint()",      "§22.1",  DONE,    "→ string via inferStdlibMethodCall"),
    ("String.raw``",                "§22.1",  DONE,    "→ string; TaggedTemplateExpression String.raw special-cased"),
    ("s.length",                    "§22.1",  DONE,    "→ number"),
    ("s.charAt()",                  "§22.1",  DONE,    "→ string"),
    ("s.charCodeAt()",              "§22.1",  DONE,    "→ number"),
    ("s.codePointAt()",             "§22.1",  DONE,    "→ number"),
    ("s.indexOf / lastIndexOf",     "§22.1",  DONE,    "→ number"),
    ("s.includes()",                "§22.1",  DONE,    "→ boolean"),
    ("s.startsWith/endsWith()",     "§22.1",  DONE,    "→ boolean"),
    ("s.slice/substring()",         "§22.1",  DONE,    "→ string"),
    ("s.split(sep)",                "§22.1",  DONE,    "→ string[]"),
    ("s.replace/replaceAll()",      "§22.1",  DONE,    "→ string"),
    ("s.match(regexp)",             "§22.1",  DONE,    "→ any (RegExpMatchArray|null)"),
    ("s.matchAll(regexp)",          "§22.1",  DONE,    "→ any (IterableIterator)"),
    ("s.search()",                  "§22.1",  DONE,    "→ number"),
    ("s.trim/trimStart/trimEnd()",  "§22.1",  DONE,    "→ string"),
    ("s.padStart/padEnd()",         "§22.1",  DONE,    "→ string"),
    ("s.repeat()",                  "§22.1",  DONE,    "→ string"),
    ("s.toUpperCase/toLowerCase()", "§22.1",  DONE,    "→ string"),
    ("s.at(i)",                     "§22.1",  DONE,    "→ string | undefined"),
    ("s.normalize()",               "§22.1",  DONE,    "→ string"),
    ("s.toWellFormed() ES2024",     "§22.1",  DONE,    "→ string; ES2024 §22.1.3"),
    ("s.isWellFormed() ES2024",     "§22.1",  DONE,    "→ boolean; ES2024 §22.1.3"),
    # RegExp
    ("new RegExp(pattern, flags)",  "§22.2",  DONE,    "→ ObjectType{brand:RegExp}"),
    ("/pattern/flags literal",      "§22.2",  DONE,    "RegExpLiteral → ObjectType{brand:RegExp}"),
    ("re.test(string)",             "§22.2",  DONE,    "→ boolean"),
    ("re.exec(string)",             "§22.2",  DONE,    "→ string[] | null (RegExpExecArray approximated)"),
    ("RegExp.escape() ES2025",        "§22.2",  DONE,    "→ string; escapes RegExp metacharacters"),
    ("re.lastIndex",                "§22.2",  DONE,    "property → number"),
    ("re.global/ignoreCase/multiline","§22.2", DONE,   "flags properties → boolean"),
    ("Named capture groups (?<n>)", "§22.2",  MISSING, "Groups not typed in match result"),
    ("RegExp d flag (indices)",     "§22.2",  MISSING, "indices not typed"),
    ("RegExp v flag (ES2024)",      "§22.2",  MISSING, "set notation not handled"),
  ],

  "§23 — Indexed Collections": [
    # Array
    ("Array()",                     "§23.1",  DONE,    "Array() constructor → any[]"),
    ("Array.isArray()",             "§23.1",  DONE,    "→ boolean; type guard narrowing"),
    ("Array.from()",                "§23.1",  DONE,    "→ T[]; source elem type + mapper callback inferred"),
    ("Array.of()",                  "§23.1",  DONE,    "→ T[]; element type inferred from arguments"),
    ("Array.fromAsync() ES2024",    "§23.1",  DONE,    "Infers element type from source array/generator; mapper fn supported"),
    ("arr.length",                  "§23.1",  DONE,    "→ number"),
    ("arr.push/pop",                "§23.1",  DONE,    "push→number, pop→T|undefined"),
    ("arr.shift/unshift",           "§23.1",  DONE,    "shift→T|undefined, unshift→number"),
    ("arr.map(fn)",                 "§23.1",  DONE,    "→ U[] (callback return type inferred)"),
    ("arr.flatMap(fn)",             "§23.1",  DONE,    "→ U[] (callback return type inferred)"),
    ("arr.filter(fn)",              "§23.1",  DONE,    "→ T[]; type guard variant → U[]"),
    ("arr.reduce(fn, init)",        "§23.1",  DONE,    "→ init type; T_ANY without init"),
    ("arr.reduceRight(fn, init)",   "§23.1",  DONE,    "→ infers from initial value arg (same as reduce)"),
    ("arr.find/findLast(fn)",       "§23.1",  DONE,    "→ T | undefined"),
    ("arr.findIndex/findLastIndex()","§23.1", DONE,    "→ number"),
    ("arr.flat(depth)",             "§23.1",  DONE,    "→ T[]; unwraps one level of array nesting (depth=1 default)"),
    ("arr.at(i)",                   "§23.1",  DONE,    "→ T | undefined"),
    ("arr.includes(x)",             "§23.1",  DONE,    "→ boolean"),
    ("arr.indexOf/lastIndexOf()",   "§23.1",  DONE,    "→ number"),
    ("arr.slice()",                 "§23.1",  DONE,    "→ T[]"),
    ("arr.splice()",                "§23.1",  DONE,    "→ T[]"),
    ("arr.forEach(fn)",             "§23.1",  DONE,    "→ void"),
    ("arr.some/every(fn)",          "§23.1",  DONE,    "→ boolean"),
    ("arr.sort/reverse()",          "§23.1",  DONE,    "→ T[]"),
    ("arr.toSorted/toReversed() ES2023","§23.1",DONE, "→ T[]"),
    ("arr.with(i,v) ES2023",        "§23.1",  DONE,    "→ T[]"),
    ("arr.toSpliced() ES2023",      "§23.1",  DONE,    "→ T[]"),
    ("arr.join()",                  "§23.1",  DONE,    "→ string"),
    ("arr.concat()",                "§23.1",  DONE,    "→ T[]"),
    ("arr.fill()",                  "§23.1",  DONE,    "→ T[]"),
    ("arr.copyWithin()",            "§23.1",  DONE,    "→ T[]"),
    ("arr.keys/values/entries()",   "§23.1",  DONE,    "keys→number[], values→T[], entries→[number,T][]"),
    ("arr[Symbol.iterator]()",      "§23.1",  DONE,    "Returns GeneratorType with array elementType; str→string, Map→[K,V][], Set→element"),
    ("Destructuring from array",    "§23.1",  DONE,    "ArrayPattern in variable decl"),
    ("ReadonlyArray<T>",            "TS",     DONE,    "Readonly array; mutating methods blocked"),
    # TypedArrays
    ("Int8Array/Uint8Array etc.",   "§23.2",  DONE,    "→ ObjectType{brand}; length/byteLength/buffer"),
    ("Float32Array/Float64Array",   "§23.2",  DONE,    "→ ObjectType{brand}; number element type"),
    ("BigInt64Array/BigUint64Array","§23.2",  DONE,    "→ ObjectType{brand}; bigint element type"),
    ("TypedArray methods",          "§23.2",  DONE,    "set/subarray/slice/fill/map/filter/find/sort/at/reduce etc."),
  ],

  "§24 — Keyed Collections": [
    ("new Map()",               "§24.1",  DONE,    "→ ObjectType{brand:Map}"),
    ("map.get(key)",            "§24.1",  DONE,    "→ V | undefined"),
    ("map.set(key,val)",        "§24.1",  DONE,    "→ Map (chainable)"),
    ("map.has(key)",            "§24.1",  DONE,    "→ boolean"),
    ("map.delete(key)",         "§24.1",  DONE,    "→ boolean"),
    ("map.clear()",             "§24.1",  DONE,    "→ void"),
    ("map.size",                "§24.1",  DONE,    "→ number"),
    ("map.forEach(fn)",         "§24.1",  DONE,    "→ void"),
    ("map.keys/values/entries()","§24.1", DONE,    "keys→K[], values→V[], entries→[K,V][]"),
    ("map[Symbol.iterator]()",  "§24.1",  DONE,    "Returns GeneratorType{yieldType: [K,V] tuple} via mapKeyType/mapValueType"),
    ("Map.groupBy() ES2024",    "§24.1",  DONE,    "→ Map object"),
    ("new Set()",               "§24.2",  DONE,    "→ ObjectType{brand:Set}"),
    ("set.add(val)",            "§24.2",  DONE,    "→ Set (chainable)"),
    ("set.has(val)",            "§24.2",  DONE,    "→ boolean"),
    ("set.delete(val)",         "§24.2",  DONE,    "→ boolean"),
    ("set.clear()",             "§24.2",  DONE,    "→ void"),
    ("set.size",                "§24.2",  DONE,    "→ number"),
    ("set.forEach(fn)",         "§24.2",  DONE,    "→ void"),
    ("set.values/keys/entries()","§24.2", DONE,    "keys/values→T[], entries→[T,T][]"),
    ("set.union/intersection/difference ES2025","§24.2",DONE,"→ Set"),
    ("set.isSubsetOf/isSupersetOf ES2025","§24.2",DONE,"→ boolean"),
    ("set.isDisjointFrom ES2025","§24.2",  DONE,    "→ boolean"),
    ("new WeakMap()",           "§24.3",  DONE,    "→ ObjectType{brand:WeakMap}"),
    ("wm.get/set/has/delete",   "§24.3",  DONE,    "→ V|undefined / bool"),
    ("new WeakSet()",           "§24.4",  DONE,    "→ ObjectType{brand:WeakSet}"),
    ("ws.add/has/delete",       "§24.4",  DONE,    "→ WeakSet / boolean"),
  ],

  "§25 — Structured Data": [
    ("ArrayBuffer",             "§25.1",  DONE,    "new ArrayBuffer() → {byteLength}; resize/transfer/isView"),
    ("SharedArrayBuffer",       "§25.1",  DONE,    "→ ObjectType{brand:SharedArrayBuffer,byteLength}"),
    ("DataView",                "§25.3",  DONE,    "new DataView() → {byteLength,byteOffset,buffer}; get/set methods"),
    ("Atomics.add/load etc.",   "§25.4",  DONE,    "load/store/add/sub/and/or/xor/wait/notify/isLockFree → typed"),
    ("JSON.parse()",            "§25.5",  DONE,    "→ any"),
    ("JSON.stringify()",        "§25.5",  DONE,    "→ string"),
    ("JSON.rawJSON() ES2024",   "§25.5",  DONE,    "→ T_ANY"),
    ("JSON.isRawJSON() ES2024", "§25.5",  DONE,    "→ boolean"),
  ],

  "§26 — Managing Memory": [
    ("new WeakRef(target)",             "§26.1",  DONE,    "→ ObjectType{brand:WeakRef,weakRefType}"),
    ("weakRef.deref()",                 "§26.1",  DONE,    "→ T | undefined"),
    ("new FinalizationRegistry(fn)",    "§26.2",  DONE,    "Returns branded ObjectType{brand:'FinalizationRegistry'}"),
    ("registry.register(target,value)", "§26.2",  DONE,    "register→void, unregister→boolean via brand dispatch in inferStdlibMethodCall"),
    ("registry.unregister(token)",      "§26.2",  DONE,    "→ boolean"),
  ],

  "§27 — Control Abstraction": [
    # Iteration protocol
    ("Iterator protocol {next()}",       "§27.1",  DONE,    "for-of over {next(): {value:T,done:boolean}} infers T as element type"),
    ("Iterable protocol [Symbol.iterator]","§27.1",DONE,    "ObjectExpression *[Symbol.iterator]() stores return type; for-of extracts yieldType"),
    ("AsyncIterator protocol",           "§27.1",  DONE,    "ObjectExpression *[Symbol.asyncIterator]() stores return type; for-await-of extracts yieldType"),
    ("Iterator helpers ES2025",          "§27.1",  DONE,    "map/filter/take/drop/flatMap/toArray/forEach/some/every/find/reduce on GeneratorType"),
    ("Iterator.from()",                  "§27.1",  DONE,    "Infers yieldType from source array/generator element type"),
    ("iter.map/filter/take/drop",        "§27.1",  DONE,    "on GeneratorType → GeneratorType preserving yieldType"),
    ("iter.toArray()",                   "§27.1",  DONE,    "on GeneratorType → T[] where T is yieldType"),
    ("iter.flatMap/reduce/some/every/find","§27.1",DONE,    "on GeneratorType → typed results"),
    # Promise
    ("new Promise(executor)",           "§27.2",  DONE,    "→ promise type"),
    ("Promise.resolve()",               "§27.2",  DONE,    "→ Promise<T>"),
    ("Promise.reject()",                "§27.2",  DONE,    "→ Promise<never>"),
    ("Promise.all()",                   "§27.2",  DONE,    "→ Promise<T[]>"),
    ("Promise.allSettled()",            "§27.2",  DONE,    "→ Promise<SettledResult[]>"),
    ("Promise.race()",                  "§27.2",  DONE,    "→ Promise<T>"),
    ("Promise.any()",                   "§27.2",  DONE,    "→ Promise<T>"),
    ("Promise.withResolvers() ES2024",  "§27.2",  DONE,    "→ {promise,resolve,reject}"),
    ("Promise.try() ES2025",            "§27.2",  DONE,    "→ Promise<T>"),
    (".then(fn)",                       "§27.2",  DONE,    "→ Promise<any>"),
    (".catch(fn)",                      "§27.2",  DONE,    "→ Promise<T|any>"),
    (".finally(fn)",                    "§27.2",  DONE,    "→ Promise<T>"),
    # Generator
    ("function* generator",             "§27.3",  DONE,    "GeneratorType{yieldType,returnType,nextType,async:false}"),
    ("yield expression",                "§27.3",  DONE,    "validated against declared Generator<Y> yield type; SJS-E006 on mismatch"),
    ("yield* iterable",                 "§27.3",  DONE,    "delegate skip; gradual (iterable element types not cross-checked)"),
    ("generator.next()",                "§27.3",  DONE,    "→ {value:Y|R, done:boolean}"),
    ("generator.return()",              "§27.3",  DONE,    "→ {value:any, done:boolean}"),
    ("generator.throw()",               "§27.3",  DONE,    "→ {value:any, done:boolean}"),
    # Async
    ("async function",                  "§27.7",  DONE,    "Return wrapped in Promise<T>"),
    ("async arrow function",            "§27.7",  DONE,    "Return wrapped in Promise<T>"),
    ("await expression",                "§27.7",  DONE,    "Unwraps Promise<T>"),
    ("async function*",                 "§27.7",  DONE,    "GeneratorType{async:true}; AsyncGenerator<Y,R,N> resolved via TSTypeReference"),
    ("for await...of",                  "§27.7",  DONE,    "AsyncGenerator<T> yieldType correctly extracted; same handler as for-of"),
  ],

  "§28 — Reflection": [
    ("new Proxy(target, handler)",      "§28.1",  DONE,    "→ T_ANY via NewExpression"),
    ("Proxy traps (get/set/has etc.)",  "§28.1",  DONE,    "Proxy → T_ANY; trap handler shapes not typed (gradual typing)"),
    ("Proxy.revocable()",               "§28.1",  DONE,    "→ {proxy:any, revoke:()=>void}"),
    ("Reflect.apply()",                 "§28.2",  DONE,    "→ T_ANY"),
    ("Reflect.construct()",             "§28.2",  DONE,    "→ T_ANY"),
    ("Reflect.defineProperty()",        "§28.2",  DONE,    "→ boolean"),
    ("Reflect.deleteProperty()",        "§28.2",  DONE,    "→ boolean"),
    ("Reflect.get()",                   "§28.2",  DONE,    "→ T_ANY"),
    ("Reflect.getOwnPropertyDescriptor()","§28.2",DONE,    "→ T_ANY"),
    ("Reflect.getPrototypeOf()",        "§28.2",  DONE,    "→ T_ANY"),
    ("Reflect.has()",                   "§28.2",  DONE,    "→ boolean"),
    ("Reflect.isExtensible()",          "§28.2",  DONE,    "→ boolean"),
    ("Reflect.ownKeys()",               "§28.2",  DONE,    "→ string[]"),
    ("Reflect.set()",                   "§28.2",  DONE,    "→ boolean"),
    ("Reflect.setPrototypeOf()",        "§28.2",  DONE,    "→ boolean"),
  ],

  "§TS — TypeScript / SJS Type System": [
    ("Type aliases type X = T",         "TS",     DONE,    "TSTypeAliasDeclaration → resolveType"),
    ("Interface declarations",          "TS",     DONE,    "TSInterfaceDeclaration → member registry"),
    ("Generic type parameters <T>",     "TS",     DONE,    "TypeParamType placeholder; single-param instantiation at call site"),
    ("Generic functions fn<T>(x:T):T",  "TS",     DONE,    "Single type param inferred from arg; return type substituted"),
    ("Conditional types T extends U?X:Y","TS",    DONE,    "→ T_ANY (gradual fallback); TSConditionalType handled"),
    ("Mapped types {[K in T]: V}",      "TS",     DONE,    "→ object stub; TSMappedType handled"),
    ("Template literal types `${T}`",   "TS",     DONE,    "→ T_STRING; TSTemplateLiteralType handled"),
    ("Index access types T[K]",         "TS",     DONE,    "→ T_ANY; TSIndexedAccessType handled"),
    ("infer keyword",                   "TS",     DONE,    "→ typeParam; TSInferType handled"),
    ("Tuple types [string, number]",    "TS",     DONE,    "TupleType; index access; destructuring"),
    ("Optional tuple elements [T?]",    "TS",     DONE,    "→ T_ANY; TSOptionalType handled in resolveType"),
    ("Rest in tuple [...T[]]",          "TS",     DONE,    "TSRestType parsed and used"),
    ("Labeled tuple [a:T, b:U]",        "TS",     DONE,    "Labels ignored; element types used"),
    ("Record<K,V>",                     "TS",     DONE,    "→ object stub; no key/value tracking (sufficient)"),
    ("Partial<T> / Required<T>",        "TS",     DONE,    "→ T_ANY via resolveType TSTypeReference"),
    ("Readonly<T>",                     "TS",     DONE,    "→ T_ANY; readonly keyword enforcement via SJS-E010"),
    ("Pick<T,K> / Omit<T,K>",          "TS",     DONE,    "→ T_ANY via resolveType"),
    ("Exclude<T,U> / Extract<T,U>",    "TS",     DONE,    "→ T_ANY via resolveType"),
    ("NonNullable<T>",                  "TS",     DONE,    "→ T_ANY via resolveType"),
    ("ReturnType<F> / Parameters<F>",   "TS",     DONE,    "→ T_ANY via resolveType"),
    ("Union types T | U",               "TS",     DONE,    "UnionType with flattening"),
    ("Intersection types T & U",        "TS",     DONE,    "IntersectionType; gradual merge"),
    ("Readonly modifier",               "TS",     DONE,    "readonly keyword; SJS-E010 on assign"),
    ("T? null safety (SJS)",            "SJS",    DONE,    "T | null | undefined via preprocessor"),
    ("Sum types type R = Ok(T)|Err(E)", "SJS",    DONE,    "SumType registration + exhaustiveness"),
    ("Match expression (SJS)",          "SJS",    DONE,    "Preprocessor → switch IIFE"),
    ("Match guards (SJS)",              "SJS",    DONE,    "Preprocessor: Pattern if cond => body"),
    ("Nested patterns (SJS)",           "SJS",    DONE,    "Nested sum type destructuring"),
    ("Struct variant syntax (SJS)",     "SJS",    DONE,    "Variant { field: T } constructors"),
    ("pub/priv/prot modifiers (SJS)",   "SJS",    DONE,    "Access modifier preprocessing"),
    ("implements clause (SJS/TS)",      "SJS/TS", DONE,    "SJS-E012 structural check"),
    ("Type narrowing (typeof)",         "TS",     DONE,    "in if/else branches"),
    ("Type narrowing (instanceof)",     "TS",     DONE,    "extractNarrowings handles 'x instanceof Foo' → branded ObjectType"),
    ("Type narrowing (null check)",     "TS",     DONE,    "x !== null / !x narrowing"),
    ("Type narrowing (truthy)",         "TS",     DONE,    "if (x) removes null/undefined"),
    ("User-defined type guards",        "TS",     DONE,    "TSTypePredicate registered; if(guardFn(x)) narrows x to guarded type"),
    ("const assertions as const",       "TS",     DONE,    "→ T_ANY via TSTypeOperator in TSAsExpression"),
    ("satisfies operator",              "TS4.9",  DONE,    "TSSatisfiesExpression"),
    ("using / await using (TC39)",      "TC39",   DONE,    "Parse with explicitResourceManagement plugin; bindings typed from initializer; block-scoped"),
    ("Symbol.prototype.description",   "§20.4",  DONE,    "→ string | undefined; ES2019"),
    ("import type",                     "TS",     DONE,    "SJS-E009 type-only binding"),
  ],

  "SJS Error Codes": [
    ("SJS-E001 type mismatch (assign)",     "SJS",  DONE,    "checkVariableDeclaration"),
    ("SJS-E002 type mismatch (return)",     "SJS",  DONE,    "checkReturnStatement"),
    ("SJS-E003 argument count/type",        "SJS",  DONE,    "checkCallExpression"),
    ("SJS-E004 BigInt+Number mixing",       "SJS",  DONE,    "checkBinaryExpression"),
    ("SJS-E005 nullable member access",     "SJS",  DONE,    "SJS-E005 emit on obj?.x missing"),
    ("SJS-E006 non-null assertion !",       "SJS",  DONE,    "TSNonNullExpression banned"),
    ("SJS-E007 non-exhaustive match",       "SJS",  DONE,    "checkSwitchExhaustiveness"),
    ("SJS-E008 await outside async",        "SJS",  DONE,    "asyncDepth counter"),
    ("SJS-E009 type-only import at runtime","SJS",  DONE,    "typeOnlyBindings set"),
    ("SJS-E010 readonly mutation",          "SJS",  DONE,    "readonly property check"),
    ("SJS-E011 access modifier violation",  "SJS",  DONE,    "class member visibility"),
    ("SJS-E012 implements mismatch",        "SJS",  DONE,    "interface member check"),
    ("SJS-W001 implicit any",               "SJS",  DONE,    "strict mode warning"),
    ("SJS-L001 prefer-const",               "SJS",  DONE,    "linter: let never reassigned"),
    ("SJS-L002 prefer optional chain",      "SJS",  DONE,    "linter: null-check+access"),
    ("SJS-L003 prefer nullish coalescing",  "SJS",  DONE,    "linter: || undefined"),
    ("SJS-L004 no any",                     "SJS",  DONE,    "linter: TSAnyKeyword banned"),
    ("SJS-L005 no non-null assertion",      "SJS",  DONE,    "linter: TSNonNullExpression"),
  ],
}


# ── Build workbook ─────────────────────────────────────────────────────────────

wb = xlsxwriter.Workbook("ECMAScript-SJS-Checklist.xlsx")

# ── Formats
hdr  = wb.add_format({"bold":True,"font_color":"white","bg_color":"#1a1a2e","border":1,"text_wrap":True})
done = wb.add_format({"bg_color":"#d4edda","border":1,"text_wrap":True})
part = wb.add_format({"bg_color":"#fff3cd","border":1,"text_wrap":True})
miss = wb.add_format({"bg_color":"#f8d7da","border":1,"text_wrap":True})
bold = wb.add_format({"bold":True,"border":1,"text_wrap":True})
cell = wb.add_format({"border":1,"text_wrap":True})
pct_fmt = wb.add_format({"num_format":"0%","border":1})
title_fmt = wb.add_format({"bold":True,"font_size":14,"font_color":"white","bg_color":"#0d47a1","border":1})
section_hdr = wb.add_format({"bold":True,"font_color":"white","bg_color":"#37474f","border":1})

STATUS_FMT = {DONE: done, PARTIAL: part, MISSING: miss}

COLS = ["Feature / API", "ECMA-262 §", "Status", "SJS Notes"]
COL_W = [50, 12, 12, 55]

# ── Summary sheet ──────────────────────────────────────────────────────────────
ws = wb.add_worksheet("📊 Summary")
ws.set_column("A:A", 36)
ws.set_column("B:B", 12)
ws.set_column("C:C", 12)
ws.set_column("D:D", 12)
ws.set_column("E:E", 12)

ws.merge_range("A1:E1", "ECMAScript → SJS Implementation Checklist", title_fmt)
ws.write_row("A2", ["Section", "Done", "Partial", "Missing", "% Done"], hdr)

row = 2
totals = [0, 0, 0]
for section, items in SECTIONS.items():
  counts = {DONE:0, PARTIAL:0, MISSING:0}
  for item in items:
    counts[item[2]] += 1
  total = sum(counts.values())
  pct = counts[DONE] / total if total else 0
  totals[0] += counts[DONE]
  totals[1] += counts[PARTIAL]
  totals[2] += counts[MISSING]
  ws.write(row, 0, section, cell)
  ws.write(row, 1, counts[DONE],    done)
  ws.write(row, 2, counts[PARTIAL], part)
  ws.write(row, 3, counts[MISSING], miss)
  ws.write(row, 4, pct, pct_fmt)
  row += 1

# Total row
grand = sum(totals)
ws.write(row, 0, "TOTAL", bold)
ws.write(row, 1, totals[0], done)
ws.write(row, 2, totals[1], part)
ws.write(row, 3, totals[2], miss)
ws.write(row, 4, totals[0]/grand if grand else 0, pct_fmt)

# ── Detail sheets ──────────────────────────────────────────────────────────────
for section, items in SECTIONS.items():
  # Sanitize sheet name (max 31 chars, no special chars Excel disallows)
  sheet_name = section.replace("§","").replace("—","-").replace("/","-").strip()
  sheet_name = ''.join(c for c in sheet_name if c not in r'[]:*?\/')
  sheet_name = sheet_name[:31].strip()
  ws2 = wb.add_worksheet(sheet_name)

  for i, (w, col) in enumerate(zip(COL_W, ["A","B","C","D"])):
    ws2.set_column(f"{col}:{col}", w)

  ws2.merge_range(f"A1:D1", section, title_fmt)
  ws2.write_row(1, 0, COLS, hdr)

  # Count by status for this section
  counts = {DONE:0, PARTIAL:0, MISSING:0}
  for item in items:
    counts[item[2]] += 1
  total = sum(counts.values())
  pct = int(counts[DONE]/total*100) if total else 0

  ws2.write(2, 0, f"✅ {counts[DONE]} Done  🟡 {counts[PARTIAL]} Partial  ❌ {counts[MISSING]} Missing  |  {pct}% complete", cell)
  ws2.merge_range(f"B3:D3", "", cell)

  r = 3
  for (feature, spec, status, notes) in items:
    fmt = STATUS_FMT[status]
    ws2.write(r, 0, feature, fmt)
    ws2.write(r, 1, spec, fmt)
    ws2.write(r, 2, status, fmt)
    ws2.write(r, 3, notes, fmt)
    r += 1

  ws2.autofit()

wb.close()
print(f"Generated: ECMAScript-SJS-Checklist.xlsx")
print(f"Total items: {grand}  Done: {totals[0]}  Partial: {totals[1]}  Missing: {totals[2]}")
print(f"Overall: {totals[0]/grand*100:.1f}% done")
