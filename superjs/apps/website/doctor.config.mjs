/**
 * React Doctor configuration.
 *
 * Each override below suppresses a rule for files where it is a confirmed
 * false positive or a framework requirement (see the comment on each entry).
 * Rules stay fully enabled everywhere else, so NEW issues still surface — only
 * these specific, reviewed cases are filtered out.
 *
 * @type {import('react-doctor').ReactDoctorConfig}
 */
const config = {
  ignore: {
    overrides: [
      {
        // This config is loaded by React Doctor itself, not imported by the
        // app, so the dead-code analyzer can't see it's reachable.
        files: ['doctor.config.mjs'],
        rules: ['deslop/unused-file'],
      },
      {
        // Satori (ImageResponse) and the self-contained global-error boundary
        // can only be styled with inline styles — no Tailwind/CSS available.
        files: ['src/app/opengraph-image.tsx', 'src/app/apple-icon.tsx', 'src/app/global-error.tsx'],
        rules: ['react-doctor/no-inline-exhaustive-style'],
      },
      {
        // dangerouslySetInnerHTML here renders build-time Shiki highlighter
        // output (trusted), never user input.
        files: [
          'src/components/sections/CompareTabs.tsx',
          'src/components/sections/Features.tsx',
          'src/components/sections/Quickstart.tsx',
        ],
        rules: ['react-doctor/no-danger', 'react-doctor/dangerous-html-sink'],
      },
      {
        // Escaped, server-generated JSON-LD — not attacker-controlled.
        files: ['src/components/seo/JsonLd.tsx'],
        rules: ['react-doctor/no-danger'],
      },
      {
        // Inline theme script must run before paint to avoid a flash; it is a
        // static, app-authored string (no user input).
        files: ['src/app/layout.tsx'],
        rules: ['react-doctor/no-danger', 'react-doctor/nextjs-no-native-script'],
      },
      {
        // MDX renderer: the inline-vs-block `code` branch is intentional, and
        // heading/anchor content arrives at runtime via {...props} children.
        files: ['src/components/docs/DocContent.tsx'],
        rules: [
          'react-doctor/no-polymorphic-children',
          'react-doctor/anchor-has-content',
          'react-doctor/heading-has-content',
        ],
      },
      {
        // Theme + mounted state must be initialized in an effect: the value
        // depends on the DOM (data-theme) which is unavailable during SSR.
        files: ['src/components/ui/ThemeToggle.tsx'],
        rules: ['react-doctor/no-initialize-state'],
      },
    ],
  },
}

export default config
