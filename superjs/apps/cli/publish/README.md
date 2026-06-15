# @superjsorg/cli

The [Super.js](https://superjs.org) command-line compiler — a null-safe,
sum-typed superset of JavaScript that compiles to plain JS.

Self-contained bundle with no runtime dependencies. Provides the `superjs` command.

## Install

```bash
npm install -g @superjsorg/cli
```

## Usage

```bash
superjs build src/              # compile every .sjs under src/ → dist/
superjs build app.sjs --watch   # recompile on change
superjs check src/              # type-check only (use --format json for CI)
superjs explain SJS-E001        # explain a diagnostic code
superjs init                    # write a default superjs.config.json
superjs doctor                  # report environment health
```

Build options live in `superjs.config.json`. See the full
[CLI reference](https://superjs.org/docs/cli).

## Links

- Website & playground: <https://superjs.org>
- Documentation: <https://superjs.org/docs/intro>
- Programmatic API: [`@superjsorg/compiler`](https://www.npmjs.com/package/@superjsorg/compiler)
- Source: <https://github.com/hbarve1/super-js>

## License

GPL-3.0-or-later
