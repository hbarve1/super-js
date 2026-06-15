import type { Metadata } from 'next'
import {
  GITHUB_URL,
  GITHUB_DISCUSSIONS,
  GITHUB_ISSUES,
  GITHUB_CONTRIBUTING,
  GITHUB_CODE_OF_CONDUCT,
  GITHUB_SECURITY,
  GITHUB_SPONSORS,
} from '@/lib/site'

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Get involved with Super.js — ask questions, report issues, contribute code, read the roadmap, and support the project.',
  alternates: { canonical: '/community' },
}

interface Card {
  title: string
  body: string
  href: string
  cta: string
  external?: boolean
}

const GET_INVOLVED: Card[] = [
  {
    title: 'Discussions',
    body: 'Ask questions, share what you built, and talk language design with the community on GitHub Discussions.',
    href: GITHUB_DISCUSSIONS,
    cta: 'Open Discussions',
    external: true,
  },
  {
    title: 'Issues',
    body: 'Found a bug or have a feature request? File it on the issue tracker — reproductions with a playground link help most.',
    href: GITHUB_ISSUES,
    cta: 'Report an issue',
    external: true,
  },
  {
    title: 'Roadmap',
    body: 'See what is built, what is in progress, and what is planned across the staged path to 1.0.',
    href: '/docs/roadmap',
    cta: 'View the roadmap',
  },
]

const CONTRIBUTE: Card[] = [
  {
    title: 'Contributing guide',
    body: 'Project layout, how to build and test, branch and PR conventions, and what makes a change easy to review.',
    href: GITHUB_CONTRIBUTING,
    cta: 'Read CONTRIBUTING',
    external: true,
  },
  {
    title: 'Code of Conduct',
    body: 'Super.js is a welcoming, harassment-free community. By participating you agree to uphold our Code of Conduct.',
    href: GITHUB_CODE_OF_CONDUCT,
    cta: 'Read the Code of Conduct',
    external: true,
  },
  {
    title: 'Security',
    body: 'Found a vulnerability? Please report it privately following our security policy rather than opening a public issue.',
    href: GITHUB_SECURITY,
    cta: 'Security policy',
    external: true,
  },
]

function LinkCard({ card }: { card: Card }) {
  const ext = card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <a
      href={card.href}
      {...ext}
      className="flex min-w-0 flex-col rounded-xl border border-border bg-white/[0.02] p-6 transition-colors hover:border-orange/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
    >
      <h3 className="font-semibold text-text-primary">{card.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{card.body}</p>
      <span className="mt-4 text-sm font-medium text-orange">
        {card.cta} <span aria-hidden="true">→</span>
      </span>
    </a>
  )
}

export default function CommunityPage() {
  return (
    <main id="main-content" className="min-h-screen bg-bg-deep px-4 pt-24 pb-16 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm uppercase tracking-widest text-orange">Community</p>
          <h1 className="text-4xl font-bold text-text-primary">Get involved</h1>
          <p className="mt-4 leading-relaxed text-text-muted">
            Super.js is open source and built in the open. Whether you want to ask a question, fix a
            bug, or shape the language, here is where to start.
          </p>
        </header>

        <section aria-labelledby="get-involved" className="mb-14">
          <h2 id="get-involved" className="mb-5 text-2xl font-bold text-text-primary">
            Connect
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {GET_INVOLVED.map((c) => (
              <LinkCard key={c.title} card={c} />
            ))}
          </div>
        </section>

        <section aria-labelledby="contribute" className="mb-14">
          <h2 id="contribute" className="mb-5 text-2xl font-bold text-text-primary">
            Contribute
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {CONTRIBUTE.map((c) => (
              <LinkCard key={c.title} card={c} />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="support"
          className="rounded-2xl border border-orange/20 bg-orange-dim p-8 text-center"
        >
          <h2 id="support" className="text-2xl font-bold text-text-primary">
            Support the project
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-muted">
            Super.js is free and open source. The simplest way to help is to star the repo so more
            people find it — and sponsorship funds the work toward 1.0.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
            >
              ★ Star on GitHub
            </a>
            <a
              href={GITHUB_SPONSORS}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              Sponsor
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
