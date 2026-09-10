import type { EvidenceStatus } from '@/lib/marketing/case-studies'

const LABELS: Record<EvidenceStatus, string> = {
  measured: 'Measured',
  projected: 'Projected',
  observed: 'Observed',
}

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span className="font-mono-accent text-brand-600">{LABELS[status]}</span>
  )
}
