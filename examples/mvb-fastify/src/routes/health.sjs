/** GET /health — liveness probe. */
export function registerHealth(app: dynamic): void {
  app.get("/health", async () => {
    const ts: number = Date.now()
    return { status: "ok", ts }
  })
}
