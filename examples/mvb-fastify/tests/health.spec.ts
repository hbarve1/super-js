import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('mvb-fastify', () => {
  let proc: ChildProcessWithoutNullStreams

  beforeAll(async () => {
    proc = spawn('node', ['dist/main.js'], { cwd: root, stdio: 'pipe' })
    await sleep(800)
  })

  afterAll(() => {
    proc.kill('SIGTERM')
  })

  it('GET /health returns ok', async () => {
    const res = await fetch('http://127.0.0.1:3000/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; ts: number }
    expect(body.status).toBe('ok')
    expect(typeof body.ts).toBe('number')
  })

  it('GET /users returns seeded users', async () => {
    const res = await fetch('http://127.0.0.1:3000/users')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; role: string }[]
    expect(body.length).toBeGreaterThanOrEqual(2)
  })
})
