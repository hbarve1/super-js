// @superjs/types-vite — hand-curated SJS bindings for Vite 5.x core surface.

export type PluginOption = Plugin | dynamic;

export type Plugin {
  name: string;
  apply: string;
  config: dynamic;
  configureServer: dynamic;
  transform: dynamic;
}

export type ServerOptions {
  port: number;
  host: string;
  strictPort: boolean;
  open: boolean | string;
}

export type BuildOptions {
  outDir: string;
  sourcemap: boolean | string;
  target: string;
  minify: boolean | string;
}

export type UserConfig {
  root: string;
  base: string;
  mode: string;
  plugins: PluginOption[];
  server: ServerOptions;
  build: BuildOptions;
  resolve: dynamic;
  define: dynamic;
}

export type ConfigEnv {
  mode: string;
  command: string;
}

export type UserConfigFn = (env: ConfigEnv) => UserConfig;

export type DefineConfigFn = (config: UserConfig) => UserConfig;
