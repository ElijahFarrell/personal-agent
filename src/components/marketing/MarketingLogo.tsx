import Link from 'next/link'

export function MarketingLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-semibold tracking-tight text-foreground ${className ?? ''}`}
    >
      <span
        aria-hidden
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-gradient-to-br from-brand-50 to-card shadow-sm"
      >
        <svg
          viewBox="0 0 36 36"
          className="h-6 w-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shilohLogoStroke" x1="7" y1="6" x2="30" y2="31" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1F8A7A" />
              <stop offset="1" stopColor="#145C52" />
            </linearGradient>
          </defs>
          <path
            d="M8.2 22.4c0-5.5 4.3-10 9.8-10s9.8 4.5 9.8 10"
            stroke="url(#shilohLogoStroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M11.7 22.4c0-3.5 2.8-6.3 6.3-6.3s6.3 2.8 6.3 6.3"
            stroke="url(#shilohLogoStroke)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M18 13.4v10.2"
            stroke="url(#shilohLogoStroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7.8 27.3h20.4"
            stroke="url(#shilohLogoStroke)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="8" cy="27.3" r="1.7" fill="#1F8A7A" />
          <circle cx="18" cy="27.3" r="1.7" fill="#187A6C" />
          <circle cx="28" cy="27.3" r="1.7" fill="#145C52" />
          <circle cx="18" cy="7.7" r="1.4" fill="#8ECFC4" />
        </svg>
      </span>
      <span className="font-display text-lg">Shiloh AI</span>
    </Link>
  )
}
