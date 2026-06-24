// @superjs/types-jsonwebtoken — hand-curated SJS bindings for jsonwebtoken 9.x.

export type JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  aud: string | string[];
  iss: string;
}

export type SignOptions {
  expiresIn: string | number;
  audience: string | string[];
  issuer: string;
  algorithm: string;
}

export type VerifyOptions {
  audience: string | string[];
  issuer: string;
  algorithms: string[];
  maxAge: string | number;
}

export type Jwt {
  sign(payload: dynamic, secret: string, opts: SignOptions): string;
  verify(token: string, secret: string, opts: VerifyOptions): JwtPayload;
  decode(token: string): JwtPayload | null;
}
