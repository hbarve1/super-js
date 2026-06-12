import { join } from 'node:path'
import type { NextConfig } from 'next'

/**
 * SuperJS website — App Router, strict TS. Lives inside the NX monorepo at
 * `apps/website`; `outputFileTracingRoot` points at the repo root so Next traces
 * files correctly despite the workspace lockfile sitting above this directory.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
}

export default nextConfig
