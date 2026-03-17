'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Save,
  Loader2,
  Coins,
  Calendar,
  Users,
  Settings,
  CreditCard,
} from 'lucide-react'
import { AGENT_REGISTRY } from '@/constants/agents'
import { DEFAULT_CONFIG, type TenantConfig } from '@/constants/featureGating'
import { isSuperAdmin } from '@/middleware/adminGuard'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const INTEGRATION_PROVIDERS = [
  'apollo',
  'outlook',
  'gmail',
  'google-calendar',
  'slack',
  'linkedin',
  'instagram',
  'notion',
  'hubspot',
  'salesforce',
  'pipedrive',
  'zoho-crm',
  'jira',
  'asana',
  'monday',
  'microsoft-teams',
  'discord',
  'google-docs',
  'google-sheet',
  'airtable',
  'follow-up-boss',
  'calendly',
  'stripe',
  'quickbooks',
  'mailchimp',
] as const

const BILLING_MODELS = [
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'flat', label: 'Flat' },
  { value: 'usage', label: 'Usage' },
  { value: 'flat_plus_usage', label: 'Flat + Usage' },
  { value: 'trial', label: 'Trial' },
  { value: 'friend', label: 'Friend' },
] as const

const FEATURE_KEYS = [
  'customWorkflows',
  'deepResearch',
  'outreachCampaigns',
  'prospectTable',
  'exaWebsets',
  'crmSync',
  'customSkills',
  'voiceMode',
  'workflowBuilder',
  'scheduledTasks',
] as const

function featureLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

export default function AdminOrgConfigPage() {
  const { user } = useUser()
  const params = useParams()
  const orgId = params.orgId as string

  const [tenant, setTenant] = useState<{ name: string } | null>(null)
  const [config, setConfig] = useState<
    (TenantConfig & { adminNotes?: string }) | null
  >(null)
  const [billing, setBilling] = useState<{
    creditBalance: number
    trialEndsAt?: number
    stripeCustomerId?: string
  } | null>(null)
  const [members, setMembers] = useState<
    { _id: string; email: string; role: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [extendDays, setExtendDays] = useState(7)
  const [addCredits, setAddCredits] = useState(100)

  const isAdmin = isSuperAdmin(user?.id ?? null)

  useEffect(() => {
    if (!orgId || !isAdmin) return

    async function load() {
      try {
        const [configRes, billingRes] = await Promise.all([
          fetch(`/api/admin/orgs/${orgId}/config`),
          fetch(`/api/admin/orgs/${orgId}/billing`),
        ])

        if (configRes.ok) {
          const data = await configRes.json()
          setConfig({
            allowedAgents: data.allowedAgents ?? DEFAULT_CONFIG.allowedAgents,
            allowedIntegrations:
              data.allowedIntegrations ?? DEFAULT_CONFIG.allowedIntegrations,
            features: { ...DEFAULT_CONFIG.features, ...data.features },
            limits: { ...DEFAULT_CONFIG.limits, ...data.limits },
            billingModel: data.billingModel ?? DEFAULT_CONFIG.billingModel,
            adminNotes: data.adminNotes ?? '',
          })
        } else {
          setConfig({ ...DEFAULT_CONFIG, adminNotes: '' })
        }

        if (billingRes.ok) {
          const data = await billingRes.json()
          setBilling(data)
        }

        const listRes = await fetch('/api/admin/orgs')
        if (listRes.ok) {
          const list = await listRes.json()
          const found = list.find(
            (r: { tenant: { _id: string } }) => r.tenant._id === orgId
          )
          if (found) setTenant({ name: found.tenant.name })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [orgId, isAdmin])

  async function loadMembers() {
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSave() {
    if (!config || !user) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          adminNotes: config.adminNotes ?? '',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleExtendTrial() {
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendTrialDays: extendDays }),
      })
      if (!res.ok) throw new Error('Failed to extend trial')
      const data = await fetch(`/api/admin/orgs/${orgId}/billing`).then((r) =>
        r.json()
      )
      setBilling(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleAddCredits() {
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: addCredits }),
      })
      if (!res.ok) throw new Error('Failed to add credits')
      const data = await fetch(`/api/admin/orgs/${orgId}/billing`).then((r) =>
        r.json()
      )
      setBilling(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  function toggleAgent(id: string) {
    if (!config) return
    const current = config.allowedAgents
    if (current === 'all') {
      setConfig({
        ...config,
        allowedAgents: AGENT_REGISTRY.filter((a) => a.id !== id).map(
          (a) => a.id
        ),
      })
    } else if (current.includes(id)) {
      const next = current.filter((a) => a !== id)
      setConfig({ ...config, allowedAgents: next })
    } else {
      setConfig({ ...config, allowedAgents: [...current, id] })
    }
  }

  function toggleIntegration(provider: string) {
    if (!config) return
    const current = config.allowedIntegrations
    if (current === 'all') {
      setConfig({
        ...config,
        allowedIntegrations: INTEGRATION_PROVIDERS.filter((p) => p !== provider),
      })
    } else if (current.includes(provider)) {
      const next = current.filter((p) => p !== provider)
      setConfig({ ...config, allowedIntegrations: next })
    } else {
      setConfig({ ...config, allowedIntegrations: [...current, provider] })
    }
  }

  function setAllAgents(all: boolean) {
    if (!config) return
    setConfig({
      ...config,
      allowedAgents: all ? 'all' : [],
    })
  }

  function setAllIntegrations(all: boolean) {
    if (!config) return
    setConfig({
      ...config,
      allowedIntegrations: all ? 'all' : [],
    })
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">Access denied.</p>
        <Link
          href="/dashboard"
          className="text-sm text-brand-400 hover:text-brand-300"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (loading || !config) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const trialEndsAt =
    typeof billing?.trialEndsAt === 'number' ? billing.trialEndsAt : 0
  const isOnTrial = trialEndsAt > 0 && trialEndsAt > Date.now()
  const trialDays =
    trialEndsAt > 0
      ? Math.ceil((trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))
      : 0

  const sectionClass =
    'rounded-xl border border-border bg-card/50 p-5 space-y-4'

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/admin" className="hover:text-foreground">
            Admin
          </Link>
          <span>/</span>
          <Link
            href="/dashboard/admin"
            className="hover:text-foreground"
          >
            Organizations
          </Link>
          <span>/</span>
          <span className="text-foreground">{tenant?.name ?? orgId}</span>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin"
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Back to orgs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {tenant?.name ?? 'Configure org'}
            </h1>
            <p className="text-sm text-muted-foreground">{orgId}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="gap-2"
              onClick={loadMembers}
            >
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">
                Summary
              </h2>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Billing model</dt>
                  <dd>{config.billingModel ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Credits</dt>
                  <dd>{billing?.creditBalance ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Trial</dt>
                  <dd>
                    {isOnTrial ? `${trialDays} days left` : 'No active trial'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Agents</dt>
                  <dd>
                    {config.allowedAgents === 'all'
                      ? 'All'
                      : config.allowedAgents.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Integrations</dt>
                  <dd>
                    {config.allowedIntegrations === 'all'
                      ? 'All'
                      : config.allowedIntegrations.length}
                  </dd>
                </div>
              </dl>
            </section>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <section className={sectionClass}>
              <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4" />
                Billing model
              </h2>
              <select
                value={config.billingModel ?? 'friend'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    billingModel: e.target
                      .value as TenantConfig['billingModel'],
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BILLING_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </section>

            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">Agents</h2>
              <div className="mb-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllAgents(true)}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllAgents(false)}
                >
                  None
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {AGENT_REGISTRY.map((agent) => {
                  const allowed =
                    config.allowedAgents === 'all' ||
                    config.allowedAgents.includes(agent.id)
                  return (
                    <label
                      key={agent.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => toggleAgent(agent.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{agent.displayName}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">
                Integrations
              </h2>
              <div className="mb-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllIntegrations(true)}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllIntegrations(false)}
                >
                  None
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {INTEGRATION_PROVIDERS.map((provider) => {
                  const allowed =
                    config.allowedIntegrations === 'all' ||
                    config.allowedIntegrations.includes(provider)
                  return (
                    <label
                      key={provider}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => toggleIntegration(provider)}
                        className="rounded"
                      />
                      <span className="text-sm">{provider}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">Features</h2>
              <div className="space-y-3">
                {FEATURE_KEYS.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-input px-3 py-2"
                  >
                    <label
                      htmlFor={key}
                      className="cursor-pointer text-sm"
                    >
                      {featureLabel(key)}
                    </label>
                    <Switch
                      id={key}
                      checked={config.features[key]}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          features: {
                            ...config.features,
                            [key]: checked,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">Limits</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    'maxMembers',
                    'maxProspectsPerMonth',
                    'maxWorkflows',
                    'maxSchedules',
                    'maxSkills',
                    'monthlyCredits',
                  ] as const
                ).map((key) => (
                  <div key={key}>
                    <label
                      htmlFor={key}
                      className="block text-xs text-muted-foreground"
                    >
                      {featureLabel(key)} (-1 = unlimited)
                    </label>
                    <input
                      id={key}
                      type="number"
                      value={config.limits[key]}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          limits: {
                            ...config.limits,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">
                Admin notes
              </h2>
              <textarea
                value={config.adminNotes ?? ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    adminNotes: e.target.value,
                  })
                }
                placeholder="Internal notes about this org…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </section>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save config
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <section className={sectionClass}>
              <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Coins className="h-4 w-4" />
                Billing
              </h2>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Credits: {billing?.creditBalance ?? '—'} ·{' '}
                  {isOnTrial
                    ? `${trialDays} days trial left`
                    : 'No active trial'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    value={extendDays}
                    onChange={(e) =>
                      setExtendDays(Number(e.target.value))
                    }
                    className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtendTrial}
                  >
                    Extend trial (days)
                  </Button>
                  <input
                    type="number"
                    value={addCredits}
                    onChange={(e) =>
                      setAddCredits(Number(e.target.value))
                    }
                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCredits}
                  >
                    Add credits
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <section className={sectionClass}>
              <h2 className="text-sm font-medium text-foreground">Members</h2>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No members yet, or click the tab to load.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {members.map((m) => (
                    <li
                      key={m._id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm">{m.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
