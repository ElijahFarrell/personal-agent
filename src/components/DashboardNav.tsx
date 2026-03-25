'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Plug,
  Zap,
  MessageSquare,
  FileText,
  Bot,
  Users,
  Sparkles,
  FolderOpen,
  ChevronRight,
  Inbox,
  Film,
  LineChart,
  Radar,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const NAV_GROUP_STORAGE_KEY = 'dashboard-nav-groups'

interface NavItem {
  type: 'item'
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

interface NavGroup {
  type: 'group'
  label: string
  icon: React.ElementType
  storageKey: string
  children: NavItem[]
}

const NAV_CONFIG: (NavItem | NavGroup)[] = [
  { type: 'item', href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  {
    type: 'group',
    label: 'AI',
    icon: Sparkles,
    storageKey: 'ai',
    children: [
      { type: 'item', href: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
      { type: 'item', href: '/dashboard/agents', label: 'Agents', icon: Bot },
    ],
  },
  { type: 'item', href: '/dashboard/prospects', label: 'Prospects', icon: Users },
  {
    type: 'group',
    label: 'Content & Ads',
    icon: FolderOpen,
    storageKey: 'workspace',
    children: [
      { type: 'item', href: '/dashboard/context', label: 'Context', icon: FileText },
      { type: 'item', href: '/dashboard/skills', label: 'Skills', icon: Zap },
      { type: 'item', href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
      { type: 'item', href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
      { type: 'item', href: '/dashboard/content/drafts', label: 'Drafts', icon: FileText },
      { type: 'item', href: '/dashboard/content/video', label: 'Video', icon: Film },
      { type: 'item', href: '/dashboard/content/metaAdsInsights', label: 'Meta Ads', icon: LineChart },
      {
        type: 'item',
        href: '/dashboard/content/competitiveAds',
        label: 'Competitive Ads',
        icon: Radar,
      },
    ],
  },
]

function loadGroupState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(NAV_GROUP_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

/** Default open state when no localStorage; matches common path-based behavior */
function getDefaultGroupState(pathname: string): Record<string, boolean> {
  return {
    ai: pathname.startsWith('/dashboard/chat') || pathname.startsWith('/dashboard/agents'),
    workspace:
      pathname.startsWith('/dashboard/context') ||
      pathname.startsWith('/dashboard/skills') ||
      pathname.startsWith('/dashboard/integrations') ||
      pathname.startsWith('/dashboard/inbox') ||
      pathname.startsWith('/dashboard/content'),
  }
}

function saveGroupState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NAV_GROUP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function isChildActive(pathname: string, items: NavItem[]): boolean {
  return items.some((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  )
}

export function DashboardNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
    getDefaultGroupState(pathname)
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setGroupOpen(loadGroupState())
    }
  }, [mounted])

  const toggleGroup = useCallback((key: string) => {
    setGroupOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      saveGroupState(next)
      return next
    })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
          aria-label="AI OS home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 shadow-md shadow-brand-600/30">
            <Zap className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">AI OS</span>
        </Link>
      </div>

      <nav className="flex-1 px-3" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5" role="list">
          {NAV_CONFIG.map((entry) => {
            if (entry.type === 'item') {
              const isActive = entry.exact
                ? pathname === entry.href
                : pathname.startsWith(entry.href)
              const Icon = entry.icon
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                      'touch-action-manipulation',
                      isActive
                        ? 'bg-brand-600/15 text-brand-400'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-100'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'
                      )}
                      aria-hidden="true"
                    />
                    {entry.label}
                  </Link>
                </li>
              )
            }

            const group = entry as NavGroup
            const GroupIcon = group.icon
            const isOpen = groupOpen[group.storageKey] ?? isChildActive(pathname, group.children)
            const hasActiveChild = isChildActive(pathname, group.children)

            return (
              <li key={group.storageKey}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleGroup(group.storageKey)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                      'touch-action-manipulation',
                      hasActiveChild
                        ? 'bg-brand-600/15 text-brand-400'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-100'
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform',
                        isOpen ? 'rotate-90' : ''
                      )}
                      aria-hidden="true"
                    />
                    <GroupIcon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        hasActiveChild ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'
                      )}
                      aria-hidden="true"
                    />
                    {group.label}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-0.5 flex flex-col gap-0.5 pl-9" role="list">
                      {group.children.map((child) => {
                        const isActive = child.exact
                          ? pathname === child.href
                          : pathname.startsWith(child.href)
                        const ChildIcon = child.icon
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                'touch-action-manipulation',
                                isActive
                                  ? 'bg-brand-600/15 text-brand-400'
                                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-100'
                              )}
                            >
                              <ChildIcon
                                className={cn(
                                  'h-4 w-4 shrink-0 transition-colors',
                                  isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'
                                )}
                                aria-hidden="true"
                              />
                              {child.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-800/60 px-4 py-4">
        {mounted ? (
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-7 w-7',
              },
            }}
          />
        ) : (
          <div
            className="h-7 w-7 rounded-full bg-gray-700 animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
