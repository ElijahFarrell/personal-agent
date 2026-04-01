/**
 * Fixed decorative layer: subtle dot grid + soft purple aurora orbs.
 */
export function MarketingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="marketing-aurora-center absolute left-1/2 top-[-10%] h-[min(80vh,36rem)] w-[min(100vw,48rem)] -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-500/35 via-brand-600/20 to-transparent blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[28rem] w-[28rem] rounded-full bg-brand-700/15 blur-3xl" />
      <div className="absolute bottom-[10%] right-[-15%] h-[24rem] w-[24rem] rounded-full bg-violet-600/10 blur-3xl" />
    </div>
  )
}
