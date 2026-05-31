// testing/01-basic.test.sjs — basic SJS tests with Result<T,E>
type Result<T, E> = | Ok(T) | Err(E)

function parseNumber(s: string): Result<number, string> {
  const n = Number(s)
  if (isNaN(n)) return Err("not a number: " + s)
  return Ok(n)
}

function assertOk<T, E>(r: Result<T, E>, label: string): T {
  return match r {
    Ok(v) => v
    Err(e) => { throw new Error(label + " expected Ok, got Err: " + e) }
  }
}

function assertErr<T, E>(r: Result<T, E>, label: string): E {
  return match r {
    Err(e) => e
    Ok(v) => { throw new Error(label + " expected Err, got Ok: " + v) }
  }
}

function test_parseNumber_valid(): void {
  const v = assertOk(parseNumber("42"), "parseNumber('42')")
  console.assert(v === 42, "expected 42, got " + v)
  console.log("PASS: parseNumber valid")
}

function test_parseNumber_invalid(): void {
  const e = assertErr(parseNumber("hello"), "parseNumber('hello')")
  console.assert(e.startsWith("not a number"), "unexpected: " + e)
  console.log("PASS: parseNumber invalid")
}

test_parseNumber_valid()
test_parseNumber_invalid()
