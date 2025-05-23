export interface TransformOptions {
  target: string;
  module: string;
  sourceMaps: boolean;
}

export interface CompileOptions {
  watch?: boolean;
  outDir?: string;
  target?: string;
  module?: string;
  sourceMaps?: boolean;
  declaration?: boolean;
}

export interface CompileResult {
  code: string;
  map?: string;
  declarations?: string;
}

export interface WatchOptions {
  include: string[];
  exclude: string[];
  debounce?: number;
}

export interface DiagnosticMessage {
  code: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  file?: string;
  line?: number;
  column?: number;
}

export interface CompilationContext {
  sourceFile: string;
  sourceCode: string;
  options: CompileOptions;
  diagnostics: DiagnosticMessage[];
} 