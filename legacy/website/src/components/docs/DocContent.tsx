import { MDXRemote } from 'next-mdx-remote/rsc'
import { CodeBlockWrapper } from '@/components/ui/CodeBlock'

interface DocContentProps {
  source: string
}

const mdxComponents = {
  h1: (props: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl font-bold text-[#f8fafc] mt-8 mb-4 first:mt-0" {...props} />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-2xl font-semibold text-[#f8fafc] mt-8 mb-3 border-b border-white/10 pb-2" {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-xl font-semibold text-[#f8fafc] mt-6 mb-2" {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="text-[#94a3b8] leading-7 mb-4" {...props} />
  ),
  a: (props: React.ComponentPropsWithoutRef<'a'>) => (
    <a className="text-[#f97316] hover:text-[#fbbf24] underline underline-offset-2 transition-colors" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="text-[#94a3b8] list-disc list-inside space-y-1 mb-4 pl-4" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="text-[#94a3b8] list-decimal list-inside space-y-1 mb-4 pl-4" {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-7" {...props} />
  ),
  blockquote: (props: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-[#f97316] pl-4 my-4 text-[#94a3b8] italic" {...props} />
  ),
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="text-left px-4 py-2 text-[#f8fafc] font-semibold bg-white/5 border border-white/10" {...props} />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="px-4 py-2 text-[#94a3b8] border border-white/10" {...props} />
  ),
  code: (props: React.ComponentPropsWithoutRef<'code'>) => (
    <code className="px-1.5 py-0.5 rounded text-[#fbbf24] bg-white/10 font-mono text-sm" {...props} />
  ),
  hr: () => <hr className="border-white/10 my-8" />,
  pre: (props: React.ComponentPropsWithoutRef<'pre'>) => (
    <CodeBlockWrapper>{props.children}</CodeBlockWrapper>
  ),
}

export default function DocContent({ source }: DocContentProps) {
  return (
    <article className="flex-1 min-w-0 max-w-3xl py-8" data-pagefind-body>
      <MDXRemote source={source} components={mdxComponents} />
    </article>
  )
}
