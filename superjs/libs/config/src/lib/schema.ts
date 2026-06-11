/**
 * superjs.config.json — typed model + defaults.
 * Mirrors specs/config-schema.json (JSON Schema draft 2020-12).
 */

export type Target =
  | 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023' | 'ES2024' | 'ESNext';

export const TARGETS: readonly Target[] = [
  'ES2020', 'ES2021', 'ES2022', 'ES2023', 'ES2024', 'ESNext',
];

export type SourceMapMode = 'none' | 'inline' | 'external';
export type JsxRuntime = 'automatic' | 'classic';
export type Eol = 'lf' | 'crlf' | 'auto';

export interface CompilerOptions {
  readonly strict: boolean;
  readonly noEmitOnError: boolean;
  readonly target: Target;
  readonly outDir?: string;
  readonly sourceMap: SourceMapMode;
  readonly watch: boolean;
}

export interface JsxOptions {
  readonly runtime: JsxRuntime;
  readonly importSource: string;
  readonly pragma: string;
  readonly pragmaFrag: string;
}

export interface OutputVariant {
  readonly name: string;
  readonly target: Target;
  readonly outDir?: string;
}

export interface OutputOptions {
  readonly variants?: readonly OutputVariant[];
  readonly eol: Eol;
}

export interface LspOptions {
  readonly memoryBudgetMB: number;
}

export interface EnvOptions {
  readonly allowlist: readonly string[];
}

/** A fully-resolved config (defaults applied). */
export interface ResolvedConfig {
  readonly language: '1.0';
  readonly extends?: string;
  readonly compilerOptions: CompilerOptions;
  readonly jsx: JsxOptions;
  readonly paths: Readonly<Record<string, readonly string[]>>;
  readonly output: OutputOptions;
  readonly lsp: LspOptions;
  readonly env: EnvOptions;
}

/** A user-authored config (everything optional, deep-partial). */
export type SuperJSConfig = {
  language?: '1.0';
  extends?: string;
  compilerOptions?: Partial<CompilerOptions>;
  jsx?: Partial<JsxOptions>;
  paths?: Record<string, string[]>;
  output?: Partial<OutputOptions>;
  lsp?: Partial<LspOptions>;
  env?: Partial<EnvOptions>;
};

export const DEFAULT_CONFIG: ResolvedConfig = Object.freeze({
  language: '1.0',
  compilerOptions: Object.freeze({
    strict: false,
    noEmitOnError: false,
    target: 'ES2022' as Target,
    sourceMap: 'none' as SourceMapMode,
    watch: false,
  }),
  jsx: Object.freeze({
    runtime: 'automatic' as JsxRuntime,
    importSource: 'react',
    pragma: 'React.createElement',
    pragmaFrag: 'React.Fragment',
  }),
  paths: Object.freeze({}),
  output: Object.freeze({ eol: 'lf' as Eol }),
  lsp: Object.freeze({ memoryBudgetMB: 128 }),
  env: Object.freeze({ allowlist: Object.freeze([]) as readonly string[] }),
});
