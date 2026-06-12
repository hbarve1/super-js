import { join } from 'node:path'
import type { NextConfig } from 'next'

/**
 * SuperJS website — App Router, strict TS. Lives inside the NX monorepo at
 * `apps/website`; `outputFileTracingRoot` points at the repo root so Next traces
 * files correctly despite the workspace lockfile sitting above this directory.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  // Allow LAN devices (phones) to load dev resources when running `next dev -H 0.0.0.0`.
  // Dev-only; ignored in production builds.
  allowedDevOrigins: ['192.168.0.132'],
}

export default nextConfig
