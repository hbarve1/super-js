import { createHighlighter, type Highlighter, type ThemeRegistration } from 'shiki'

export type CodeLang = 'typescript' | 'javascript' | 'bash' | 'json'

/** Languages loaded into every Shiki highlighter (imperative + MDX rehype). */
export const SHIKI_LANGS = ['typescript', 'javascript', 'tsx', 'jsx', 'bash', 'json'] as const

/**
 * `superjs-dark` — bespoke Shiki theme matching the site's orange/amber palette
 * (SPEC §Phase B): keywords orange, strings amber, types emerald, on the dark
 * card background.
 */
export const superjsDark: ThemeRegistration = {
  name: 'superjs-dark',
  type: 'dark',
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#f8fafc',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6b7280', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new'], settings: { foreground: '#f97316' } },
    { scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'], settings: { foreground: '#fbbf24' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: '#34d399' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#60a5fa' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.language.boolean', 'support.constant'], settings: { foreground: '#a78bfa' } },
    { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: '#f8fafc' } },
    { scope: ['variable.parameter'], settings: { foreground: '#e2e8f0' } },
    { scope: ['keyword.operator'], settings: { foreground: '#94a3b8' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#94a3b8' } },
  ],
}

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [superjsDark],
      langs: [...SHIKI_LANGS],
    })
  }
  return highlighterPromise
}

/** Server-side highlight to HTML using the singleton `superjs-dark` highlighter. */
export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const hl = await getHighlighter()
  return hl.codeToHtml(code, { lang, theme: 'superjs-dark' })
}
