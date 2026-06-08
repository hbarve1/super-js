// testing/02-async.test.sjs — testing async Result<T,E>
type Result<T, E> = | Ok(T) | Err(E)
type HttpError = | NetworkError(string) | NotFound

async function fakeFetch(url: string): Promise<Result<string, HttpError>> {
  if (url.includes("missing")) return Err(NotFound)
  return Ok('{"data":"hello"}')
}

async function test_fetch_ok(): Promise<void> {
  const r = await fakeFetch("https://example.com/data")
  match r {
    Ok(body) => {
      console.assert(body.includes("hello"))
      console.log("PASS: fetch ok")
    }
    Err(_) => { throw new Error("expected Ok") }
  }
}

async function test_fetch_notfound(): Promise<void> {
  const r = await fakeFetch("https://example.com/missing")
  match r {
    Err(NotFound) => console.log("PASS: fetch NotFound")
    Err(NetworkError(msg)) => { throw new Error("expected NotFound: " + msg) }
    Ok(_) => { throw new Error("expected Err") }
  }
}

async function runAll(): Promise<void> {
  await test_fetch_ok()
  await test_fetch_notfound()
}

runAll().catch(e => { console.error("TEST FAILED:", e.message); process.exit(1) })
