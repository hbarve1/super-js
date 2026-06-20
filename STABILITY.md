# Stability Tiers

SuperJS uses three stability tiers:

## stable

APIs tagged `stable` follow semver strictly. Breaking changes require a major version bump
and a 6-month deprecation window with an alias at the old name.

Stable surface areas as of v1.0:

- `@superjs/compiler` public API (`compile`, `parse`, `check`)
- `@superjs/stdlib` exports
- CLI commands: `check`, `build`, `format`, `lint`, `doc`, `init`, `verify`, `migrate`
- Diagnostic codes (SJS-EXXX numbers are permanent)
- `superjs.config.json` schema

## beta

APIs tagged `beta` may change between minor versions with a deprecation notice.
Located at `@superjs/std-*/beta/` subpath exports.

## unstable

Internal APIs, nightly builds, and features behind `--unstable` flag.
No backwards-compatibility guarantees.

See [docs/deprecation.md](docs/deprecation.md) for how stable APIs are retired.
