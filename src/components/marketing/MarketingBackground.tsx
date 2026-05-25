/**
 * Fixed decorative layer: warm paper base + soft terracotta wash + grain.
 */
export function MarketingBackground() {
  return (
    <div
      aria-hidden
      className="marketing-paper-grain pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(24,20,18,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute -right-[20%] top-[-15%] h-[min(70vh,28rem)] w-[min(80vw,36rem)] rounded-full bg-gradient-to-bl from-brand-200/80 via-brand-100/40 to-transparent blur-3xl" />
      <div className="absolute bottom-[-25%] left-[-15%] h-[22rem] w-[22rem] rounded-full bg-gradient-to-tr from-brand-100/60 to-transparent blur-3xl" />
    </div>
  )
}
