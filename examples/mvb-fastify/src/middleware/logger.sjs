/** Log each request method + URL (demo middleware). */
export function attachLogger(app: dynamic): void {
  app.addHook("onRequest", async (req: dynamic, _reply: dynamic) => {
    const method: string = req.method
    const url: string = req.url
    console.log(`${method} ${url}`)
  })
}
