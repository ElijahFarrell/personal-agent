'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface LegalStatusResponse {
  accepted: boolean
  missing: Array<'terms' | 'privacy' | 'compliance_agreement'>
}

const DOC_LABELS: Record<string, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  compliance_agreement: 'Compliance Agreement',
}

const DOC_LINKS: Record<string, string> = {
  terms: '/terms',
  privacy: '/privacy',
  compliance_agreement: '/compliance-agreement',
}

export function LegalComplianceGate() {
  const [status, setStatus] = useState<LegalStatusResponse | null>(null)
  const [acceptedDocs, setAcceptedDocs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/compliance/legal-status')
      .then(async (res) => {
        const data = (await res.json()) as LegalStatusResponse
        if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
        setStatus(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
  }, [])

  const missing = status?.missing ?? []
  const allChecked = missing.every((doc) => acceptedDocs.includes(doc))

  if (!status || status.accepted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold">Accept legal terms to continue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Before using automation and calling features, review and accept all
          required legal documents.
        </p>

        <div className="mt-5 space-y-3">
          {missing.map((doc) => (
            <label
              key={doc}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm">
                <Link href={DOC_LINKS[doc]} target="_blank" className="underline">
                  {DOC_LABELS[doc]}
                </Link>
              </span>
              <Checkbox
                checked={acceptedDocs.includes(doc)}
                onCheckedChange={(checked) => {
                  setAcceptedDocs((prev) =>
                    checked
                      ? [...new Set([...prev, doc])]
                      : prev.filter((value) => value !== doc)
                  )
                }}
              />
            </label>
          ))}
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 flex justify-end">
          <Button
            disabled={!allChecked || submitting}
            onClick={async () => {
              setSubmitting(true)
              setError(null)
              try {
                const res = await fetch('/api/compliance/accept', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ acceptedDocs: missing }),
                })
                const data = (await res.json()) as { error?: string }
                if (!res.ok) throw new Error(data.error ?? 'Failed')
                setStatus({ accepted: true, missing: [] })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? 'Saving…' : 'Accept and continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
