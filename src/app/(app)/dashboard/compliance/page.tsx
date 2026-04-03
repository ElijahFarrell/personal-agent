'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComplianceAuditRow {
  _id: string
  createdAt: number
  decision: 'allow' | 'block'
  channel: 'voice_call' | 'sms' | 'email'
  phone: string
  reasonCodes: string[]
  policyVersion: string
}

export default function CompliancePage() {
  const [rows, setRows] = useState<ComplianceAuditRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/compliance/audit')
      .then(async (res) => {
        const data = (await res.json()) as { rows?: ComplianceAuditRow[]; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Failed to load')
        setRows(data.rows ?? [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
  }, [])

  const blocked = rows?.filter((row) => row.decision === 'block').length ?? 0
  const allowed = rows?.filter((row) => row.decision === 'allow').length ?? 0

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground">
            Outbound preflight audit trail, decisions, and violation visibility.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/compliance/audit?format=csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Allowed events
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{allowed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Blocked events
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{blocked}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent audit events</CardTitle>
        </CardHeader>
        <CardContent>
          {!rows && !error ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {rows && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : null}
          {rows && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Decision</th>
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-border/50">
                      <td className="py-2 pr-3">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">{row.decision}</td>
                      <td className="py-2 pr-3">{row.channel}</td>
                      <td className="py-2 pr-3">{row.phone}</td>
                      <td className="py-2 pr-3">{row.reasonCodes.join(', ') || 'none'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
