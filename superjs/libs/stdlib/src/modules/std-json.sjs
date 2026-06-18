// @superjs/std-json — Result-returning JSON parse/stringify.

export type JsonResult<T> = JsonOk(T) | JsonErr(string);

export function parse(text: string): JsonResult<dynamic> {
  try {
    const value = JSON.parse(text);
    return JsonOk(value);
  } catch (e) {
    return JsonErr("invalid JSON");
  }
}

export function stringify(value: dynamic): string {
  return JSON.stringify(value);
}

export function stringifyPretty(value: dynamic, indent: number): string {
  return JSON.stringify(value, null, indent);
}
