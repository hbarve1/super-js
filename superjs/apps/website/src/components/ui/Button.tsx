import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'ghost'
type Size = 'sm' | 'md'

type ButtonProps = {
  readonly variant?: Variant
  readonly href?: string
  readonly size?: Size
  readonly children: ReactNode
} & Omit<ComponentProps<'button'>, 'ref'>

const base =
  'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:from-orange-400 hover:to-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]',
  ghost:
    'border border-border text-text-secondary hover:border-hairline-strong hover:text-text-primary bg-transparent',
}

/** Primary (orange→amber gradient) or ghost button. Renders a Link when `href` is set. */
export function Button({
  variant = 'primary',
  href,
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    // Default to a non-submitting button; callers can override `type` via props.
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
