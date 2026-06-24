// @superjs/types-pino — hand-curated SJS bindings for Pino 9.x core surface.

export type LogFn = (obj: dynamic, msg: string) => void;

export type LoggerOptions {
  level: string;
  name: string;
  serializers: dynamic;
  base: dynamic;
  timestamp: boolean;
}

export type Logger {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  child(bindings: dynamic): Logger;
  level: string;
}

export type PinoFactory = (opts: LoggerOptions) => Logger;
