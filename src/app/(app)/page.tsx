import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * `/` on the product subdomain redirects to the dashboard.
 * All other hosts fall through to the marketing site (`/marketing`).
 */
export default async function AppRootPage() {
  const host = (await headers()).get('host')?.split(':')[0] ?? ''
  if (host.startsWith('aios.')) {
    redirect('/dashboard')
  }
  redirect('/marketing')
}
