// @superjs/types-winston — hand-curated SJS bindings for Winston 3.x core surface.

export type LogEntry {
  level: string;
  message: string;
  meta: dynamic;
}

export type Transport {
  level: string;
  silent: boolean;
}

export type Logger {
  log(level: string, message: string, meta: dynamic): Logger;
  info(message: string, meta: dynamic): Logger;
  warn(message: string, meta: dynamic): Logger;
  error(message: string, meta: dynamic): Logger;
  debug(message: string, meta: dynamic): Logger;
  child(meta: dynamic): Logger;
  add(transport: Transport): Logger;
}

export type Winston {
  createLogger(opts: dynamic): Logger;
  format: dynamic;
  transports: {
    Console: dynamic;
    File: dynamic;
  };
}
