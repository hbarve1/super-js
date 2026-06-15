import type { NextConfig } from 'next'

/**
 * SuperJS website — App Router, strict TS. Lives inside the NX monorepo at
 * `apps/website`. `outputFileTracingRoot` is intentionally NOT set: pointing it
 * above the app's directory makes Vercel's Next builder mis-resolve the app path
 * (drops the `superjs/` segment). Vercel manages file tracing from the Root
 * Directory; the dev-only multiple-lockfiles warning is harmless.
 */
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  // Allow LAN devices (phones) to load dev resources when running `next dev -H 0.0.0.0`.
  // Dev-only; ignored in production builds.
  allowedDevOrigins: ['192.168.0.132'],
}

export default nextConfig
