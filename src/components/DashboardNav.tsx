'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Plug, Zap, MessageSquare, FileText, Bot, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, exact: false },
  { href: '/dashboard/prospects', label: 'Prospects', icon: Users, exact: false },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot, exact: false },
  { href: '/dashboard/context', label: 'Context', icon: FileText, exact: false },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug, exact: false },
  { href: '/dashboard/skills', label: 'Skills', icon: Zap, exact: false },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
          aria-label="AI OS home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">AI OS</span>
        </Link>
      </div>

      <nav className="flex-1 px-3" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5" role="list">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    'touch-action-manipulation',
                    isActive
                      ? 'bg-brand-600/15 text-brand-400'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-100',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-800/60 px-4 py-4">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-7 w-7',
            },
          }}
        />
      </div>
    </div>
  )
}
