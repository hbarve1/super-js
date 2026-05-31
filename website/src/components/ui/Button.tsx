import Link from 'next/link'
import { type ComponentProps } from 'react'

type ButtonProps = {
  variant?: 'primary' | 'ghost'
  href?: string
  size?: 'sm' | 'md'
} & ComponentProps<'button'>

export function Button({
  variant = 'primary',
  href,
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
  }
  const variants = {
    primary:
      'bg-gradient-to-r from-orange-500 to-amber-400 text-black hover:from-orange-400 hover:to-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]',
    ghost:
      'border border-white/10 text-white/70 hover:border-white/25 hover:text-white bg-transparent',
  }

  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
