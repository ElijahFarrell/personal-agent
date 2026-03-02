import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import type { CalendarEvent } from '@/types'
import { getConnection } from './nangoService'

const CALENDAR_PROVIDER = 'google-calendar' as const

function createCalendarClient(accessToken: string) {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

function toCalendarEvent(
  item: {
    id?: string | null
    summary?: string | null
    description?: string | null
    start?: { dateTime?: string | null; date?: string | null }
    end?: { dateTime?: string | null; date?: string | null }
    attendees?: Array<{ email?: string | null }>
    location?: string | null
    hangoutLink?: string | null
  }
): CalendarEvent {
  const start = item.start?.dateTime ?? item.start?.date ?? ''
  const end = item.end?.dateTime ?? item.end?.date ?? ''
  const attendees =
    item.attendees?.map((a) => a.email ?? '').filter(Boolean) ?? []

  return {
    id: item.id ?? '',
    title: item.summary ?? '',
    description: item.description ?? undefined,
    startTime: start,
    endTime: end,
    attendees: attendees.length > 0 ? attendees : undefined,
    location: item.location ?? undefined,
    meetingLink: item.hangoutLink ?? undefined,
  }
}

/**
 * Lists today's calendar events for a user.
 *
 * @param userId - User/connection ID
 * @returns Array of calendar events for today
 */
export async function listTodayEvents(
  userId: string
): Promise<CalendarEvent[]> {
  const creds = await getConnection(CALENDAR_PROVIDER, userId)
  if (!creds) throw new Error('Google Calendar not connected for user')

  const calendar = createCalendarClient(creds.accessToken)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  )

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const items = res.data.items ?? []
  return items.map(toCalendarEvent)
}

/**
 * Lists upcoming calendar events for the next N days.
 *
 * @param userId - User/connection ID
 * @param days - Number of days ahead (default 7)
 * @returns Array of calendar events
 */
export async function listUpcomingEvents(
  userId: string,
  days = 7
): Promise<CalendarEvent[]> {
  const creds = await getConnection(CALENDAR_PROVIDER, userId)
  if (!creds) throw new Error('Google Calendar not connected for user')

  const calendar = createCalendarClient(creds.accessToken)
  const now = new Date()
  const timeMax = new Date(now)
  timeMax.setDate(timeMax.getDate() + days)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const items = res.data.items ?? []
  return items.map(toCalendarEvent)
}

/**
 * Creates a calendar event. Partial event allows flexible input.
 *
 * @param userId - User/connection ID
 * @param event - Partial event (title, startTime, endTime required)
 * @returns Created calendar event with ID
 */
export async function createEvent(
  userId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const creds = await getConnection(CALENDAR_PROVIDER, userId)
  if (!creds) throw new Error('Google Calendar not connected for user')

  const calendar = createCalendarClient(creds.accessToken)

  const body: {
    summary?: string
    description?: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    attendees?: Array<{ email: string }>
    location?: string
  } = {
    start: {},
    end: {},
  }

  if (event.title) body.summary = event.title
  if (event.description) body.description = event.description
  if (event.startTime) {
    body.start.dateTime = event.startTime
    body.start.date = undefined
  }
  if (event.endTime) {
    body.end.dateTime = event.endTime
    body.end.date = undefined
  }
  if (event.attendees?.length) {
    body.attendees = event.attendees.map((email) => ({ email }))
  }
  if (event.location) body.location = event.location

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: body,
  })

  return toCalendarEvent(res.data)
}
