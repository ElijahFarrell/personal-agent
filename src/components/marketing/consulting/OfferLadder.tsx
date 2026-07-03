import { offerLadder } from '@/lib/marketing/consulting-copy'

export function OfferLadder() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Engagement offer ladder"
    >
      {offerLadder.map((step, i) => (
        <div key={step.label} className="relative">
          {i < offerLadder.length - 1 ? (
            <span
              className="absolute right-0 top-1/2 hidden h-px w-4 translate-x-full bg-border lg:block"
              aria-hidden
            />
          ) : null}
          <div className="marketing-card h-full rounded-xl p-5 text-center sm:text-left">
            <p className="font-mono text-xs tabular-nums text-brand-500">
              {String(i + 1).padStart(2, '0')}
            </p>
            <h3 className="font-display mt-2 text-lg text-foreground">
              {step.label}
            </h3>
            <p className="font-display mt-1 text-2xl tabular-nums text-brand-600">
              {step.price}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
