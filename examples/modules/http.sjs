// modules/http.sjs — async HTTP module with Result<T,E>
export type Result<T, E> = | Ok(T) | Err(E)
export type HttpError = | NetworkError(string) | NotFound | Timeout

export const DEFAULT_TIMEOUT = 5000

export async function get<T>(url: string): Promise<Result<T, HttpError>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const resp = await globalThis.fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (resp.status === 404) return Err(NotFound)
    if (!resp.ok) return Err(NetworkError("status " + resp.status))
    const data: T = await resp.json()
    return Ok(data)
  } catch (e: dynamic) {
    clearTimeout(timer)
    if (e && e.name === "AbortError") return Err(Timeout)
    return Err(NetworkError(String(e)))
  }
}
