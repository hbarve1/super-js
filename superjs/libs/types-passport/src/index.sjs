// @superjs/types-passport — hand-curated SJS bindings for Passport 0.7.x core surface.

export type DoneCallback = (err: dynamic, user: dynamic, info: dynamic) => void;

export type Strategy {
  name: string;
  authenticate(req: dynamic, opts: dynamic): void;
}

export type AuthenticateOptions {
  session: boolean;
  failureRedirect: string;
  successRedirect: string;
}

export type PassportStatic {
  use(strategy: Strategy): PassportStatic;
  authenticate(strategy: string, opts: AuthenticateOptions): dynamic;
  initialize(): dynamic;
  session(): dynamic;
  serializeUser(fn: dynamic): void;
  deserializeUser(fn: dynamic): void;
}
