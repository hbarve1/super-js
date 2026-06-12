import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'ghost'

const base =
  'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-orange to-amber text-black hover:opacity-90',
  ghost:
    'border border-border text-text-primary hover:bg-white/5',
}

type ButtonProps = {
  readonly variant?: Variant
  readonly children: ReactNode
} & (
  | ({ readonly href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>)
  | ({ readonly href?: undefined } & ComponentProps<'button'>)
)

/** Primary (orange→amber gradient) or ghost button. Renders a Link when `href` is set. */
export function Button({ variant = 'primary', children, ...rest }: ButtonProps) {
  const className = `${base} ${variants[variant]}`
  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest
    return (
      <Link href={href} className={className} {...linkRest}>
        {children}
      </Link>
    )
  }
  const { href: _omit, ...buttonRest } = rest
  return (
    <button className={className} {...buttonRest}>
      {children}
    </button>
  )
}
