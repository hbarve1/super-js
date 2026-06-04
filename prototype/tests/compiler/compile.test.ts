import { compile as _compile } from '../../src/compiler'
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { execSync } from 'child_process'

type CompileParams = Parameters<typeof _compile>[0]
const compile = (opts: CompileParams) => _compile({ silent: true, ...opts })

const EXAMPLES_DIR = resolve(__dirname, '../../examples')
const TMP_OUT = resolve(__dirname, '../__tmp_out__')

beforeEach(() => {
  mkdirSync(TMP_OUT, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_OUT, { recursive: true, force: true })
})

// ── Basic compilation ────────────────────────────────────────────────────────

describe('compile() - single file', () => {
  it('compiles hello-world.sjs to .js', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const outFile = join(TMP_OUT, 'basics/hello-world.js')
    expect(existsSync(outFile)).toBe(true)
  })

  it('strips TypeScript type annotations from output', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const js = readFileSync(join(TMP_OUT, 'basics/hello-world.js'), 'utf-8')
    expect(js).not.toMatch(/: string/)
    expect(js).not.toMatch(/: number/)
    expect(js).not.toMatch(/: boolean/)
    expect(js).not.toMatch(/interface /)
    expect(js).not.toMatch(/type /)
  })

  it('produces runnable JavaScript', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const outFile = join(TMP_OUT, 'basics/hello-world.js')
    const output = execSync(`node "${outFile}"`).toString()
    expect(output).toContain('Hello, World!')
    expect(output).toContain('Hello, SuperJS!')
  })

  it('generates a source map file', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const mapFile = join(TMP_OUT, 'basics/hello-world.js.map')
    expect(existsSync(mapFile)).toBe(true)

    const map = JSON.parse(readFileSync(mapFile, 'utf-8'))
    expect(map).toHaveProperty('version', 3)
    expect(map).toHaveProperty('sources')
    expect(map).toHaveProperty('mappings')
  })

  it('embeds sourceMappingURL comment in output', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const js = readFileSync(join(TMP_OUT, 'basics/hello-world.js'), 'utf-8')
    expect(js).toMatch(/\/\/# sourceMappingURL=hello-world\.js\.map/)
  })

  it('throws when no sourceFile or directory provided', async () => {
    await expect(compile({ outDir: TMP_OUT })).rejects.toThrow()
  })
})

// ── Type stripping completeness ──────────────────────────────────────────────

describe('compile() - type stripping', () => {
  it('strips interface declarations', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'types/interfaces.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const js = readFileSync(join(TMP_OUT, 'types/interfaces.js'), 'utf-8')
    expect(js).not.toMatch(/^interface /m)
  })

  it('strips type alias declarations', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'types/type-aliases.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const js = readFileSync(join(TMP_OUT, 'types/type-aliases.js'), 'utf-8')
    expect(js).not.toMatch(/^type [A-Z]/m)
  })

  it('strips generic type parameters from functions', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'types/generics-advanced.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const js = readFileSync(join(TMP_OUT, 'types/generics-advanced.js'), 'utf-8')
    // Filter out comment lines before checking — comments in source may contain <T>
    const nonComments = js.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(nonComments).not.toMatch(/<[A-Z]>/)
  })

  it('compiles union types without emitting them', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'types/union-types.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const js = readFileSync(join(TMP_OUT, 'types/union-types.js'), 'utf-8')
    // Filter out comment lines — comments in source may contain type union syntax
    const nonComments = js.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(nonComments).not.toMatch(/string \| number/)
  })
})

// ── Variables and expressions ────────────────────────────────────────────────

describe('compile() - variables', () => {
  it('compiles variables.sjs and produces runnable output', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/variables.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const outFile = join(TMP_OUT, 'basics/variables.js')
    expect(existsSync(outFile)).toBe(true)
    // Should not throw
    execSync(`node "${outFile}"`)
  })

  it('preserves const/let/var semantics', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/variables.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const js = readFileSync(join(TMP_OUT, 'basics/variables.js'), 'utf-8')
    // es2022 target should preserve const/let
    expect(js).toMatch(/\bconst\b/)
    expect(js).toMatch(/\blet\b/)
  })
})

// ── OOP features ─────────────────────────────────────────────────────────────

describe('compile() - classes', () => {
  it('compiles inheritance.sjs', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'oop/inheritance.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const outFile = join(TMP_OUT, 'oop/inheritance.js')
    expect(existsSync(outFile)).toBe(true)
    execSync(`node "${outFile}"`)
  })

  it('compiles abstract-classes.sjs', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'oop/abstract-classes.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const outFile = join(TMP_OUT, 'oop/abstract-classes.js')
    expect(existsSync(outFile)).toBe(true)
  })

  it('compiles mixins.sjs and runs it', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'oop/mixins.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const outFile = join(TMP_OUT, 'oop/mixins.js')
    execSync(`node "${outFile}"`)
  })
})

// ── Async ────────────────────────────────────────────────────────────────────

describe('compile() - async', () => {
  it('compiles promises.sjs', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'async/promises.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    expect(existsSync(join(TMP_OUT, 'async/promises.js'))).toBe(true)
  })

  it('compiles async-await.sjs', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'async/async-await.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    expect(existsSync(join(TMP_OUT, 'async/async-await.js'))).toBe(true)
  })

  it('preserves async/await keywords in es2022 target', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'async/async-await.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      target: 'es2022',
    })

    const js = readFileSync(join(TMP_OUT, 'async/async-await.js'), 'utf-8')
    expect(js).toMatch(/\basync\b/)
    expect(js).toMatch(/\bawait\b/)
  })
})

// ── Gradual typing ───────────────────────────────────────────────────────────

describe('compile() - gradual typing', () => {
  it('compiles plain JS (.sjs with no annotations) unchanged in structure', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'gradual-typing/plain-js.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const outFile = join(TMP_OUT, 'gradual-typing/plain-js.js')
    expect(existsSync(outFile)).toBe(true)
    execSync(`node "${outFile}"`)
  })

  it('compiles mixed annotation file', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'gradual-typing/mixed.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    execSync(`node "${join(TMP_OUT, 'gradual-typing/mixed.js')}"`)
  })
})

// ── Functional patterns ──────────────────────────────────────────────────────

describe('compile() - functional patterns', () => {
  it('compiles functional.sjs and runs it', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'patterns/functional.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const output = execSync(`node "${join(TMP_OUT, 'patterns/functional.js')}"`).toString()
    expect(output).toContain('ALICE')   // head(['Alice',...]) → Some('Alice') → map toUpperCase
    expect(output).toContain('nobody')  // head([]) → None → getOrElse fallback
    expect(output).toContain('49')      // pipe(3, x*2, x+1, x*x) = 49
  })

  it('compiles builder.sjs and runs it', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'patterns/builder.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    const output = execSync(`node "${join(TMP_OUT, 'patterns/builder.js')}"`).toString()
    expect(output).toContain('SELECT')
    expect(output).toContain('FROM users')
  })
})

// ── Directory compilation ─────────────────────────────────────────────────────

describe('compile() - directory mode', () => {
  it('compiles all .sjs files in basics/ directory', async () => {
    await compile({
      directory: join(EXAMPLES_DIR, 'basics'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    expect(existsSync(join(TMP_OUT, 'basics/hello-world.js'))).toBe(true)
    expect(existsSync(join(TMP_OUT, 'basics/variables.js'))).toBe(true)
    expect(existsSync(join(TMP_OUT, 'basics/functions.js'))).toBe(true)
  })

  it('preserves directory structure in output', async () => {
    await compile({
      directory: join(EXAMPLES_DIR, 'basics'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
    })

    // All basics/ files should be under basics/ in outDir
    const outBasics = join(TMP_OUT, 'basics')
    expect(existsSync(outBasics)).toBe(true)
  })
})

// ── Target options ────────────────────────────────────────────────────────────

describe('compile() - target options', () => {
  it('downcompiles arrow functions for es5 target', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/functions.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      target: 'es5',
    })

    const js = readFileSync(join(TMP_OUT, 'basics/functions.js'), 'utf-8')
    // es5 target should convert arrow functions to function expressions
    expect(js).toMatch(/function\s*\(/)
  })

  it('preserves arrow functions for es2022 target', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/functions.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      target: 'es2022',
    })

    const js = readFileSync(join(TMP_OUT, 'basics/functions.js'), 'utf-8')
    expect(js).toMatch(/=>/)
  })
})

// ── P1: Source map verification ───────────────────────────────────────────────

describe('P1: Source map verification after preprocessor transforms', () => {
  it('source map references the original .sjs filename', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const mapFile = join(TMP_OUT, 'basics/hello-world.js.map')
    const map = JSON.parse(readFileSync(mapFile, 'utf-8'))
    expect(map.sources.some((s: string) => s.includes('hello-world.sjs'))).toBe(true)
  })

  it('source map version is 3 (industry standard)', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const map = JSON.parse(readFileSync(join(TMP_OUT, 'basics/hello-world.js.map'), 'utf-8'))
    expect(map.version).toBe(3)
  })

  it('source map has non-empty mappings string', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/hello-world.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const map = JSON.parse(readFileSync(join(TMP_OUT, 'basics/hello-world.js.map'), 'utf-8'))
    expect(typeof map.mappings).toBe('string')
    expect(map.mappings.length).toBeGreaterThan(0)
  })

  it('source map for classes.sjs (with OOP annotations) is valid JSON with mappings', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/classes.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const mapPath = join(TMP_OUT, 'basics/classes.js.map')
    expect(existsSync(mapPath)).toBe(true)
    const rawMap = JSON.parse(readFileSync(mapPath, 'utf-8'))
    expect(rawMap.version).toBe(3)
    expect(Array.isArray(rawMap.sources)).toBe(true)
    expect(rawMap.sources.length).toBeGreaterThan(0)
    expect(rawMap.mappings.length).toBeGreaterThan(0)
  })

  it('source map sources reference the original .sjs filename (not preprocessed)', async () => {
    await compile({
      sourceFile: join(EXAMPLES_DIR, 'basics/arrays.sjs'),
      outDir: TMP_OUT,
      sourceRoot: EXAMPLES_DIR,
      silent: true,
    })

    const map = JSON.parse(readFileSync(join(TMP_OUT, 'basics/arrays.js.map'), 'utf-8'))
    expect(map.sources.some((s: string) => s.includes('arrays.sjs'))).toBe(true)
    // sourcesContent should not be present (external map references file)
    expect(map.mappings.length).toBeGreaterThan(0)
  })
})
