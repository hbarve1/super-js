# SJS-W012 — BiDi control character in source file

**Severity:** warning  
**Category:** security  
**Stage:** Stage 1

## Description

The source file contains a Unicode bidirectional-control codepoint. These codepoints alter
the visual rendering direction of surrounding text in editors, browsers, and terminals without
changing how the compiler parses the file. Adversaries can exploit this discrepancy to make
code appear to do something different from what it actually executes — a class of attacks known
as **Trojan Source** (CVE-2021-42574).

The affected codepoint ranges are:

| Range | Names |
|---|---|
| U+202A – U+202E | LEFT-TO-RIGHT EMBEDDING, RIGHT-TO-LEFT EMBEDDING, POP DIRECTIONAL FORMATTING, LEFT-TO-RIGHT OVERRIDE, RIGHT-TO-LEFT OVERRIDE |
| U+2066 – U+2069 | LEFT-TO-RIGHT ISOLATE, RIGHT-TO-LEFT ISOLATE, FIRST STRONG ISOLATE, POP DIRECTIONAL ISOLATE |

**Default mode (warning):** SJS emits SJS-W012 and strips the codepoint from identifiers
before further analysis. Inside string and template literals the codepoint is preserved in the
emitted output (because the runtime string content is intentional), but the warning is still
emitted so that code reviewers are aware of its presence.

**`--strict-bidi` mode (error):** All occurrences of BiDi codepoints — including those inside
string literals — are rejected as hard errors (`SJS-L011`). This mode is automatically engaged
by `superjs build --release`.

**Inside identifiers (always rejected):** Regardless of mode, BiDi codepoints inside
identifiers are always a hard error (`SJS-L011`), because they can make two visually-identical
identifiers resolve to different symbols. This behaviour cannot be suppressed.

### Reference

- Boucher, N., Shumailov, I., Anderson, R., Collberg, C. (2021). **Trojan Source: Invisible
  Vulnerabilities**. USENIX Security '22. arXiv:2111.00169. CVE-2021-42574.
- GitHub Security Advisory: <https://github.com/advisories/GHSA-vwm3-crmr-xfxw>

## Example

```sjs
// ✗ warning — BiDi override inside a string literal (invisible to the human reader)
const accessLevel = "user‮ ⁦// Check if admin⁩ ⁦"
//                       ^^^ U+202E (RIGHT-TO-LEFT OVERRIDE)
// SJS-W012: BiDi codepoint U+202E in string literal at 1:21

// ✗ warning — BiDi codepoint in a comment (affects visual rendering of review tooling)
// Check if admin ⁦ user ⁩
//                ^ U+2066 (LEFT-TO-RIGHT ISOLATE)
// SJS-W012: BiDi codepoint U+2066 in comment at 5:17
```

A classic Trojan-Source pattern where the visual rendering in an editor could mislead a
reviewer into thinking a condition is the opposite of what it compiles to:

```sjs
// What the reviewer sees in some editors (with BiDi rendering):
//   if (isAdmin) { /* Check user permissions */ }
// What the compiler actually sees:
if (isUser‮ ⁦isAdmin⁩) { grantAccess() }
//          ^^^ BiDi codepoints reorder the visual display
// SJS-W012  warning  1:11  BiDi codepoint U+202E in identifier position → rejected (SJS-L011)
```

## Fix

Remove the BiDi codepoints from the source file. Most editors can display invisible codepoints
via "Show whitespace / special characters" settings. The `superjs fix` command will strip
BiDi codepoints from string literals and comments (with a confirmation prompt) in default mode.

If a BiDi codepoint is intentionally required in a string (e.g. a test fixture for a BiDi
rendering engine), use a Unicode escape sequence so that the intent is explicit and visible in
all editors:

```sjs
// ✓ correct — intent is explicit via escape; no SJS-W012
const rtlMark = "‮"
```

## Configuration

| Mode | Behaviour |
|---|---|
| Default | SJS-W012 warning; BiDi stripped from identifiers (hard); preserved in strings/comments with warning |
| `--strict-bidi` | All occurrences → SJS-L011 error; engaged automatically by `--release` |
| Inside identifiers | Always SJS-L011 regardless of mode |

There is no per-file suppression for SJS-W012. The only way to silence it is to remove the
codepoints or use Unicode escapes.

## Related codes

- `SJS-L011` — BiDi codepoint rejected in strict mode (or always, inside identifiers)
