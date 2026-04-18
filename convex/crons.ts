import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/**
 * Hourly sweep that pulls items from every agentRun's Exa webset into the
 * tenant-scoped `websetItems` table. Orchestrator tools read from that table
 * so users can reference past searches without us hitting Exa on every turn.
 */
crons.interval(
  'pull-past-websets',
  { hours: 1 },
  internal.agentWorkers.pullPastWebsets,
  { limit: 50 }
)

export default crons
