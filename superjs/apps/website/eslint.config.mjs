import nextPlugin from '@next/eslint-plugin-next'

/**
 * Self-contained flat config for the website. Decoupled from the monorepo's
 * tier-boundary lint (apps sit at the top of the dependency graph) and pinned to
 * its own ESLint 9 so it does not clash with the root's ESLint 8.
 */
export default [
  {
    ignores: ['.next/**', '.open-next/**', '.vercel/**', 'next-env.d.ts'],
  },
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
]
