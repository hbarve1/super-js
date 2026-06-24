// @superjs/types-dotenv — hand-curated SJS bindings for dotenv 16.x.

export type DotenvConfigOptions {
  path: string;
  encoding: string;
  debug: boolean;
  override: boolean;
}

export type DotenvConfigOutput {
  parsed: dynamic;
  error: dynamic;
}

export type Dotenv {
  config(opts: DotenvConfigOptions): DotenvConfigOutput;
  parse(src: string): dynamic;
}
