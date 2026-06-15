import { MDXRemote } from 'next-mdx-remote/rsc'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import { CodeBlockWrapper } from '@/components/ui/CodeBlock'
import { superjsDark, SHIKI_LANGS } from '@/lib/shiki'
import { slugify } from '@/lib/docs'

/** Give headings stable slug ids so the TOC anchors line up with the rendered DOM. */
function headingId(children: ReactNode): string | undefined {
  return typeof children === 'string' ? slugify(children) : undefined
}

const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl font-bold text-[#f8fafc] mt-8 mb-4 first:mt-0" {...props} />
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2 id={headingId(children)} className="text-2xl font-semibold text-[#f8fafc] mt-8 mb-3 border-b border-white/10 pb-2 scroll-mt-20" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 id={headingId(children)} className="text-xl font-semibold text-[#f8fafc] mt-6 mb-2 scroll-mt-20" {...props}>
      {children}
    </h3>
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-[#94a3b8] leading-7 mb-4" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="text-[#f97316] hover:text-[#fbbf24] underline underline-offset-2 transition-colors" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="text-[#94a3b8] list-disc list-inside space-y-1 mb-4 pl-4" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="text-[#94a3b8] list-decimal list-inside space-y-1 mb-4 pl-4" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="leading-7" {...props} />,
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-[#f97316] pl-4 my-4 text-[#94a3b8] italic" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<'th'>) => (
    <th className="text-left px-4 py-2 text-[#f8fafc] font-semibold bg-white/5 border border-white/10" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<'td'>) => (
    <td className="px-4 py-2 text-[#94a3b8] border border-white/10" {...props} />
  ),
  // Inline code has a plain string child; Shiki-highlighted block code (inside
  // <pre>) has element children (the token <span>s) — only style the inline case
  // so the per-token highlighting in code blocks is left untouched.
  code: ({ children, ...props }: ComponentPropsWithoutRef<'code'>) =>
    typeof children === 'string' ? (
      <code className="px-1.5 py-0.5 rounded text-[#fbbf24] bg-white/10 font-mono text-sm" {...props}>
        {children}
      </code>
    ) : (
      <code {...props}>{children}</code>
    ),
  hr: () => <hr className="border-white/10 my-8" />,
  pre: (props: ComponentPropsWithoutRef<'pre'>) => <CodeBlockWrapper {...props} />,
}

export default function DocContent({ source }: { source: string }) {
  return (
    <article className="flex-1 min-w-0 max-w-3xl py-8" data-pagefind-body>
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              [
                rehypeShiki,
                {
                  theme: superjsDark,
                  langs: [...SHIKI_LANGS],
                  // Unknown/unspecified fences fall back to plain text, never throw.
                  fallbackLanguage: 'text',
                },
              ],
            ],
          },
        }}
      />
    </article>
  )
}
