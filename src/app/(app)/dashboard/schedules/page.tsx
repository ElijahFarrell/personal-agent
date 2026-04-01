'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@convex/_generated/api'
import { Plus, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScheduleForm } from '@/components/schedules/ScheduleForm'
import { ScheduleList } from '@/components/schedules/ScheduleList'

export default function SchedulesPage() {
  const { user } = useUser()
  const [formOpen, setFormOpen] = useState(false)

  const dbUser = useQuery(
    api.users.getUserByClerkUserId,
    user ? { clerkUserId: user.id } : 'skip'
  )

  const schedules = useQuery(
    api.schedules.listByTenantId,
    dbUser ? { tenantId: dbUser.tenantId } : 'skip'
  )

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground">
            Create recurring tasks that run on a cron schedule. Use agent prompts
            or saved workflows. On Vercel Hobby the platform cron runs once per day,
            so schedules that need multiple runs per day need Pro or another
            scheduler.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {schedules === undefined && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {schedules && schedules.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-base font-medium">No schedules yet</p>
            <p className="mb-6 text-center text-muted-foreground max-w-sm">
              Create a schedule to run agent prompts or workflows automatically on
              a cron schedule (e.g. every morning at 9am).
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>
      )}

      {schedules && schedules.length > 0 && (
        <ScheduleList />
      )}

      <ScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => setFormOpen(false)}
      />
    </div>
  )
}
