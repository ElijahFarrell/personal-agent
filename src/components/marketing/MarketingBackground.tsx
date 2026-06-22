/**
 * Fixed decorative layer: cool clinical base + soft teal wash + grain.
 */
export function MarketingBackground() {
  return (
    <div
      aria-hidden
      className="marketing-paper-grain pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(hsl(210 16% 88% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(210 16% 88% / 0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="absolute -right-[15%] top-[-10%] h-[min(65vh,26rem)] w-[min(75vw,32rem)] rounded-full bg-gradient-to-bl from-brand-100/70 via-brand-50/30 to-transparent blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[20rem] w-[20rem] rounded-full bg-gradient-to-tr from-brand-100/50 to-transparent blur-3xl" />
    </div>
  )
}
