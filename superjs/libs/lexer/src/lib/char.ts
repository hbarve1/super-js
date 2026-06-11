/**
 * Character classification for the SJS lexer.
 * Identifier rules follow ECMA-262 (ID_Start / ID_Continue) plus `$` and `_`.
 * Non-ASCII categories are tested by code point to avoid source-literal hazards.
 */

const ID_START = /[\p{ID_Start}$_]/u;
// ID_Continue plus ZWNJ (U+200C) and ZWJ (U+200D), per ECMA-262 IdentifierPart.
const ID_CONTINUE = /[\p{ID_Continue}$‌‍]/u;

export function isIdentifierStart(ch: string): boolean {
  return ch.length > 0 && ID_START.test(ch);
}

export function isIdentifierPart(ch: string): boolean {
  return ch.length > 0 && ID_CONTINUE.test(ch);
}

export function isDecimalDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

export function isHexDigit(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}

export function isOctalDigit(ch: string): boolean {
  return ch >= '0' && ch <= '7';
}

export function isBinaryDigit(ch: string): boolean {
  return ch === '0' || ch === '1';
}

/** ECMA-262 line terminators: LF, CR, LS (U+2028), PS (U+2029). */
export function isLineTerminator(ch: string): boolean {
  if (ch === '\n' || ch === '\r') return true;
  const cp = ch.codePointAt(0);
  return cp === 0x2028 || cp === 0x2029;
}

/** ECMA-262 WhiteSpace (excluding line terminators). */
export function isWhitespace(ch: string): boolean {
  if (ch === '\t' || ch === '\v' || ch === '\f' || ch === ' ') return true;
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  return (
    cp === 0x00a0 || // NBSP
    cp === 0xfeff || // BOM / ZWNBSP
    cp === 0x1680 ||
    (cp >= 0x2000 && cp <= 0x200a) ||
    cp === 0x202f ||
    cp === 0x205f ||
    cp === 0x3000
  );
}

/**
 * Unicode BiDi control characters — used in "Trojan Source" attacks where
 * source renders differently than it executes. The lexer rejects these
 * (SJS-L011 / SJS-W012).
 */
const BIDI_CONTROLS = new Set([
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, // LRE RLE PDF LRO RLO
  0x2066, 0x2067, 0x2068, 0x2069,         // LRI RLI FSI PDI
]);

export function isBidiControl(ch: string): boolean {
  const cp = ch.codePointAt(0);
  return cp !== undefined && BIDI_CONTROLS.has(cp);
}
