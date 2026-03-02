import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  listTodayEvents,
  listUpcomingEvents,
  createEvent,
} from '@/services/calendarService'

/**
 * Creates a calendar list tool scoped to a user.
 * Lists today's and upcoming events.
 */
export function createCalendarListTool(userId: string) {
  return createTool({
    id: 'calendar-list',
    description:
      'List calendar events. Returns today\'s events and optionally upcoming ' +
      'events for the next N days. Use this to check the user\'s schedule.',
    inputSchema: z.object({
      includeUpcoming: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include upcoming events beyond today'),
      upcomingDays: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .default(7)
        .describe('Number of days ahead for upcoming events'),
    }),
    execute: async (input) => {
      try {
        const [today, upcoming] = await Promise.all([
          listTodayEvents(userId),
          input.includeUpcoming
            ? listUpcomingEvents(userId, input.upcomingDays)
            : Promise.resolve([]),
        ])
        return {
          today: today,
          upcoming: input.includeUpcoming ? upcoming : [],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { today: [], upcoming: [], error: message }
      }
    },
  })
}

/**
 * Creates a calendar create tool scoped to a user.
 * Creates a new calendar event.
 */
export function createCalendarCreateTool(userId: string) {
  return createTool({
    id: 'calendar-create',
    description:
      'Create a calendar event. Requires title, startTime, and endTime. ' +
      'Times should be in ISO 8601 format (e.g. 2025-02-26T09:00:00Z).',
    inputSchema: z.object({
      title: z.string().describe('Event title'),
      startTime: z.string().describe('Start time (ISO 8601)'),
      endTime: z.string().describe('End time (ISO 8601)'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location'),
      attendees: z
        .array(z.string().email())
        .optional()
        .describe('Attendee email addresses'),
    }),
    execute: async (input) => {
      try {
        const event = await createEvent(userId, {
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          description: input.description,
          location: input.location,
          attendees: input.attendees,
        })
        return { success: true, event }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
      }
    },
  })
}
