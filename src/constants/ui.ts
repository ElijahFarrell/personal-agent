/**
 * Reusable UI constants: status badge styles, stage styles, etc.
 */
import type { ProspectStatus, ProspectStage } from '@/types'

export const STATUS_META: Record<ProspectStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-gray-500/10 text-gray-400' },
  researching: { label: 'Researching', color: 'bg-blue-500/10 text-blue-400' },
  draft_ready: { label: 'Draft Ready', color: 'bg-amber-500/10 text-amber-400' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-400' },
  sent: { label: 'Sent', color: 'bg-purple-500/10 text-purple-400' },
  replied: { label: 'Replied', color: 'bg-emerald-500/10 text-emerald-400' },
  archived: { label: 'Archived', color: 'bg-gray-500/10 text-gray-500' },
}

export const STAGE_META: Record<ProspectStage, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  messaged: { label: 'Messaged', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  follow_up: { label: 'Follow Up', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  meeting_booked: { label: 'Meeting', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  interested: { label: 'Interested', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  dead: { label: 'Dead', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  deal_open: { label: 'Deal Open', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

export const ALL_STATUSES = Object.keys(STATUS_META) as ProspectStatus[]
export const ALL_STAGES = Object.keys(STAGE_META) as ProspectStage[]
