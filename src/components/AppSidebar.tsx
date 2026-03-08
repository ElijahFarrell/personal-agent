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
  Store,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
    label: 'Workspace',
    icon: FolderOpen,
    storageKey: 'workspace',
    children: [
      { type: 'item', href: '/dashboard/context', label: 'Context', icon: FileText },
      { type: 'item', href: '/dashboard/skills', label: 'Skills', icon: Zap },
      { type: 'item', href: '/dashboard/skills/browse', label: 'Skill Store', icon: Store },
      { type: 'item', href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
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

function saveGroupState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NAV_GROUP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function getDefaultGroupState(pathname: string): Record<string, boolean> {
  return {
    ai: pathname.startsWith('/dashboard/chat') || pathname.startsWith('/dashboard/agents'),
    workspace:
      pathname.startsWith('/dashboard/context') ||
      pathname.startsWith('/dashboard/skills') ||
      pathname.startsWith('/dashboard/integrations'),
  }
}

function isChildActive(pathname: string, items: NavItem[]): boolean {
  return items.some((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  )
}

export function AppSidebar() {
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
    <Sidebar side="left" collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-lg min-w-0 group-data-[collapsible=icon]:hidden"
          aria-label="AI OS home"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/30">
            <Zap className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground truncate">
            AI OS
          </span>
        </Link>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="sr-only">Main navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_CONFIG.map((entry) => {
                if (entry.type === 'item') {
                  const isActive = entry.exact
                    ? pathname === entry.href
                    : pathname.startsWith(entry.href)
                  const Icon = entry.icon
                  return (
                    <SidebarMenuItem key={entry.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={entry.href}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'touch-action-manipulation',
                            isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {entry.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                const group = entry as NavGroup
                const GroupIcon = group.icon
                const isOpen = groupOpen[group.storageKey] ?? isChildActive(pathname, group.children)
                const hasActiveChild = isChildActive(pathname, group.children)

                return (
                  <Collapsible
                    key={group.storageKey}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.storageKey)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={hasActiveChild}
                          className={cn(
                            'w-full touch-action-manipulation',
                            hasActiveChild && 'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                        >
                          <ChevronRight
                            className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-90')}
                            aria-hidden="true"
                          />
                          <GroupIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {group.label}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.children.map((child) => {
                            const isActive = child.exact
                              ? pathname === child.href
                              : pathname.startsWith(child.href)
                            const ChildIcon = child.icon
                            return (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link
                                    href={child.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className="touch-action-manipulation"
                                  >
                                    <ChildIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    {child.label}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
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
            className="h-7 w-7 rounded-full bg-sidebar-accent animate-pulse"
            aria-hidden="true"
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
