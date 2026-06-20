# Deprecation Policy

When a stable API is deprecated:

1. The old API is kept for **6 months** (one minor release cycle minimum).
2. A deprecation notice (SJS-W diagnostic or README section) is emitted.
3. The old form is removed in the next major version after the 6-month window.

This applies to: CLI flags, compiler API exports, diagnostic code semantics.
It does NOT apply to unstable or beta-tier surface.

See [STABILITY.md](../STABILITY.md) for tier definitions.
