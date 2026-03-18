/**
 * Google Calendar operations via Composio.
 * Uses Composio GOOGLECALENDAR tools with the user's connected account.
 */
import type { CalendarEvent } from '@/types'
import { executeComposioTool } from '@/lib/composio'

function toCalendarEvent(
  item: Record<string, unknown>
): CalendarEvent {
  const start = (item.start as { dateTime?: string; date?: string })?.dateTime ??
    (item.start as { dateTime?: string; date?: string })?.date ?? ''
  const end = (item.end as { dateTime?: string; date?: string })?.dateTime ??
    (item.end as { dateTime?: string; date?: string })?.date ?? ''
  const attendees = ((item.attendees as Array<{ email?: string }>) ?? [])
    .map((a) => a.email ?? '')
    .filter(Boolean)

  return {
    id: (item.id ?? '') as string,
    title: (item.summary ?? '') as string,
    description: item.description as string | undefined,
    startTime: start,
    endTime: end,
    attendees: attendees.length > 0 ? attendees : undefined,
    location: item.location as string | undefined,
    meetingLink: (item.hangoutLink ?? (item.conferenceData as { entryPoints?: Array<{ uri?: string }> })?.entryPoints?.[0]?.uri) as string | undefined,
  }
}

/**
 * Lists today's calendar events for a user.
 */
export async function listTodayEvents(
  userId: string
): Promise<CalendarEvent[]> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  )

  const result = await executeComposioTool<{ items?: Record<string, unknown>[] }>(
    userId,
    'GOOGLECALENDAR_EVENTS_LIST',
    {
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    }
  )

  if (!result.successful || !result.data) {
    if (result.error) throw new Error(result.error)
    return []
  }

  const items = result.data.items ?? (result.data as { items?: Record<string, unknown>[] }).items ?? []
  return items.map(toCalendarEvent)
}

/**
 * Lists upcoming calendar events for the next N days.
 */
export async function listUpcomingEvents(
  userId: string,
  days = 7
): Promise<CalendarEvent[]> {
  const now = new Date()
  const timeMax = new Date(now)
  timeMax.setDate(timeMax.getDate() + days)

  const result = await executeComposioTool<{ items?: Record<string, unknown>[] }>(
    userId,
    'GOOGLECALENDAR_EVENTS_LIST',
    {
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    }
  )

  if (!result.successful || !result.data) {
    if (result.error) throw new Error(result.error)
    return []
  }

  const items = result.data.items ?? (result.data as { items?: Record<string, unknown>[] }).items ?? []
  return items.map(toCalendarEvent)
}

/**
 * Creates a calendar event.
 */
export async function createEvent(
  userId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const result = await executeComposioTool<{ id?: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; attendees?: Array<{ email?: string }>; location?: string; hangoutLink?: string }>(
    userId,
    'GOOGLECALENDAR_CREATE_EVENT',
    {
      summary: event.title,
      description: event.description,
      start_datetime: event.startTime,
      end_datetime: event.endTime,
      location: event.location,
      attendees: event.attendees,
      timezone: 'UTC',
    }
  )

  if (!result.successful && result.error) {
    throw new Error(result.error)
  }

  const data = result.data
  if (!data) throw new Error('No event data returned')

  return {
    id: data.id ?? '',
    title: (data.summary ?? event.title) ?? '',
    description: event.description,
    startTime: event.startTime ?? data.start?.dateTime ?? '',
    endTime: event.endTime ?? data.end?.dateTime ?? '',
    attendees: event.attendees ?? data.attendees?.map((a) => a.email ?? '').filter(Boolean),
    location: data.location ?? event.location,
    meetingLink: data.hangoutLink,
  }
}
