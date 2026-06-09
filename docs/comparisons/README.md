# SJS Language Comparisons

Honest side-by-side comparisons. Each doc covers: what SJS borrows from that language, where it wins, where it loses, and when to choose one over the other.

| Doc | Audience |
|-----|---------|
| [SJS vs JavaScript](sjs-vs-js.md) | JS developers evaluating whether to add types |
| [SJS vs TypeScript](sjs-vs-typescript.md) | TS developers evaluating a switch |
| [SJS vs Rust](sjs-vs-rust.md) | Rust developers or teams considering Rust |
| [SJS vs Go](sjs-vs-go.md) | Go developers or teams considering Go |
| [SJS vs Dart](sjs-vs-dart.md) | Dart/Flutter developers considering cross-platform |
| [SJS vs Java / Kotlin / Swift](sjs-vs-jvm-langs.md) | Enterprise / mobile developers evaluating backend options |

## The Short Version

| Language | SJS relationship | When SJS wins |
|----------|-----------------|--------------|
| JavaScript | SJS is a strict superset — same code, with types | Always, for maintained codebases |
| TypeScript | SJS removes the unsound parts (`any`, intersection, conditional types) | When TS's complexity tax has caused real bugs |
| Rust | Different problem space; SJS borrows sum types + `Result` ideas | Web APIs, CLIs, serverless — JS ecosystem needed |
| Go | Same philosophy; SJS adds sound null safety + sum types | Node.js team; want Go simplicity on JS platform |
| Dart | Closest v2.0 competitor; Dart is Flutter-first | Backend / npm ecosystem; no mobile requirement |
| Java/Kotlin/Swift | Different platforms; SJS borrows their type ideas | Node.js backend; npm access; fast compile times |
