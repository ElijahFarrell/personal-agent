import Link from 'next/link'

export function MarketingLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-xl font-medium tracking-tight text-foreground ${className ?? ''}`}
    >
      Shiloh
    </Link>
  )
}
