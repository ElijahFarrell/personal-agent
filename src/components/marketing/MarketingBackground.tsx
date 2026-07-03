/**
 * Warm editorial background — cream base with subtle grid and paper grain.
 */
export function MarketingBackground() {
  return (
    <div
      aria-hidden
      className="marketing-paper-grain pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(hsl(30 15% 86% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(30 15% 86% / 0.4) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
    </div>
  )
}
