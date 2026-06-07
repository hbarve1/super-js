# RFC-0005: Defer Edition System to Post-1.0
- **Status:** Accepted
- **Date:** 2026-05-31
- **Author:** SuperJS Maintainers

## Summary

The SJS "edition" system — a mechanism for projects to opt into breaking language changes — is explicitly deferred to after the v1.0 release. The config schema reserves the `"language"` field for future use but does not implement edition-switching semantics in v1.0.

## Motivation

An edition system (like Rust's) allows breaking syntax or semantics changes to be opt-in per project. This is valuable for a language that expects to evolve: it lets the language make breaking changes without forcing all projects to migrate at once, and it lets tooling support multiple editions simultaneously.

However, implementing editions correctly requires the config schema, CLI, and parser to all understand and honor edition switches. The parser must be parameterized by edition, the error messages must reference which edition a construct belongs to, and the migration tooling must be able to transform code from one edition to another. This is substantial complexity to take on for v1.0 when the language itself is still being defined and stabilized.

More importantly, an edition system only makes sense once there is something to gate: at least one pair of editions with real breaking differences. At v1.0 there is only one edition by definition. Building the machinery before there is a concrete use case risks building the wrong abstraction.

## Proposal

### No edition switching in v1.0

The `superjs.config.json` `"language"` field is reserved but inert at v1.0:

```json
{
  "language": "1.0",
  "compilerOptions": {
    "strict": true,
    "target": "es2022"
  }
}
```

Valid values at v1.0:

- `"1.0"` — explicit declaration of the current edition (no effect on behavior)
- absent — equivalent to `"1.0"`

Any other value is a config validation error (`SJS-C001`).

### Future edition path

When v2.0 is defined, projects will opt in by setting:

```json
{
  "language": "2.0"
}
```

At that point the parser, type checker, and CLI will consult this field. A migration guide and codemod will be provided. Projects that do not update their config continue to compile as v1.0 without change.

### Experimental flags

If a breaking syntax change is needed before v2.0, it must be introduced via an `"experimental"` array in the config rather than a new edition:

```json
{
  "language": "1.0",
  "experimental": ["new-import-syntax"]
}
```

Experimental features carry no stability guarantee and may be changed or removed without a deprecation period. They are documented separately from stable language features.

### Schema reservation

The config JSON schema (`specs/001-superjs-core-language/contracts/config-schema.json`) marks `"language"` as a string with enum `["1.0"]` at v1.0. The enum will be widened in future schema versions. Tooling that validates the schema strictly will reject unknown edition strings, which is the desired behavior.

## Alternatives Considered

**Implement editions from day one** — rejected. The language has not stabilized enough to know what breaking changes we need to gate. Implementing edition infrastructure now means building it against hypothetical future requirements. We would likely need to revise the design once real breaking changes are identified, having spent engineering effort on the first version. "You Aren't Gonna Need It" applies here.

**Never support editions** — rejected. This leaves no migration path for future breaking changes. Every breaking change would require all users to migrate simultaneously, which does not scale as the ecosystem grows. The Rust edition model has proven that a well-designed edition system enables languages to evolve without fragmenting the community. SJS should preserve this option even if it does not exercise it at v1.0.

**Use semver major versions instead of editions** — rejected as a substitute. Semver major versions (v2.0.0) signal breaking changes in libraries but do not provide a per-project opt-in mechanism within the same toolchain version. A project using `sjs@2.0` cannot continue compiling v1.0 edition code alongside v2.0 edition code without a dedicated edition switch.

## Drawbacks

If a breaking syntax change is needed before v2.0 is formally defined, there is no edition escape hatch. The only options are: (a) accept the breakage with a migration codemod, (b) use an experimental flag (lower stability signal than an edition), or (c) accelerate the v2.0 timeline. This is a real constraint and represents the cost of deferral.

Projects that set `"language": "1.0"` explicitly in their config will need a one-line update when v2.0 is released, even if they are not opting in to v2.0 features. This is minor but worth noting as a future migration task.

## Unresolved Questions

None. The decision to defer is clear-cut and the reservation mechanism is straightforward. The design of the actual edition system is left entirely to a future RFC authored once there is a concrete breaking change to gate.
