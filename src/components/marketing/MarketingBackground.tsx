/**
 * Dark minimal background — near-black base, soft purple glow, faint grid.
 */
export function MarketingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[hsl(var(--background))]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 55% at 50% -10%, hsl(263 84% 58% / 0.14), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(hsl(260 20% 40% / 0.16) 1px, transparent 1px), linear-gradient(90deg, hsl(260 20% 40% / 0.16) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
    </div>
  )
}
