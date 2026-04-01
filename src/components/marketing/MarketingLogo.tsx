import Link from 'next/link'

export function MarketingLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-semibold tracking-tight text-white ${className ?? ''}`}
    >
      <span
        aria-hidden
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 shadow-[0_0_24px_-4px_rgba(124,58,237,0.45)]"
      >
        <span className="absolute left-0 top-0 h-2.5 w-2.5 rounded-br bg-background" />
        <span className="text-sm font-bold text-brand-400">S</span>
      </span>
      <span className="font-display text-lg">Shiloh AI</span>
    </Link>
  )
}
