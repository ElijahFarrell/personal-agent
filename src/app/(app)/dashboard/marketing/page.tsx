'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Inbox,
  LineChart,
  Megaphone,
  Plug,
  Radar,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useOrgConfig } from '@/hooks/useOrgConfig'
import { isIntegrationAllowed } from '@/constants/featureGating'

const linkCardClass =
  'group flex flex-col gap-2 rounded-xl border border-border bg-card/50 p-5 transition-colors hover:bg-accent/50'

export default function MarketingHubPage() {
  const { config } = useOrgConfig()
  const apolloOk = isIntegrationAllowed(config, 'apollo')
  const lemlistOk = isIntegrationAllowed(config, 'lemlist')
  const metaOk = isIntegrationAllowed(config, 'metaAds')

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Connect outreach tools, triage email in the inbox, and review campaign performance.
          </p>
        </div>
      </div>

      <div className="space-y-8 p-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Outreach &amp; integrations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/integrations" className={linkCardClass}>
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Integrations</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm text-muted-foreground">
                Connect Apollo, Lemlist, Mailchimp, and other marketing tools.
              </p>
            </Link>
            {apolloOk && (
              <Link href="/dashboard/integrations" className={linkCardClass}>
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-amber-400" />
                  <span className="font-medium">Apollo</span>
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Prospecting and enrichment — connect under Integrations, then use the SDR agent in
                  Chat.
                </p>
              </Link>
            )}
            {lemlistOk && (
              <Link href="/dashboard/integrations" className={linkCardClass}>
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-400" />
                  <span className="font-medium">Lemlist</span>
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Multichannel sequences and campaign stats — connect here, then sync metrics on the
                  Campaigns page.
                </p>
              </Link>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Inbox &amp; performance</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/inbox" className={linkCardClass}>
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Unified inbox</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm text-muted-foreground">
                Email triage (Gmail / Outlook / WhatsApp). Reply, draft with AI, and sort by
                priority.
              </p>
            </Link>
            <Link href="/dashboard/marketing/campaigns" className={linkCardClass}>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Campaign metrics</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm text-muted-foreground">
                Lemlist campaign snapshots: sent, replies, opens — synced automatically.
              </p>
            </Link>
            {metaOk && (
              <Link href="/dashboard/content/metaAdsInsights" className={linkCardClass}>
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-blue-400" />
                  <span className="font-medium">Meta Ads</span>
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Spend, impressions, and performance for Facebook / Instagram campaigns.
                </p>
              </Link>
            )}
            <Link href="/dashboard/content/competitiveAds" className={linkCardClass}>
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-cyan-400" />
                <span className="font-medium">Competitive Ads</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm text-muted-foreground">
                Research competitor creatives and messaging via Search API.
              </p>
            </Link>
          </div>
        </section>

        <Card className="border-border bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How this fits together</CardTitle>
            <CardDescription>
              The inbox is for <strong className="text-foreground">email-style threads</strong>.
              Apollo and Lemlist are connected in Integrations and used from Chat (SDR and Marketing
              agents) or synced into the Campaigns dashboard for Lemlist stats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/chat">Open Chat</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
