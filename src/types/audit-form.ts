/** Client-side state for the Free AI Audit wizard (matches Convex `auditSubmissions`). */
export type AuditFormData = {
  name: string
  email: string
  role: string
  roleOther: string
  industry: string
  industryOther: string
  teamSize: string
  topTasks: string
  weeklyManualHours: string
  oneTaskToHandOff: string
  currentTools: string[]
  toolsOther: string
  toolFrustration: string
  offToolProcesses: string
  biggestChallenge: string
  biggestChallengeOther: string
  aiExperience: string
  aiWishIn30Days: string
  monthlyLeads: string
  annualRevenue: string
}

export const emptyAuditForm = (): AuditFormData => ({
  name: '',
  email: '',
  role: '',
  roleOther: '',
  industry: '',
  industryOther: '',
  teamSize: '',
  topTasks: '',
  weeklyManualHours: '',
  oneTaskToHandOff: '',
  currentTools: [],
  toolsOther: '',
  toolFrustration: '',
  offToolProcesses: '',
  biggestChallenge: '',
  biggestChallengeOther: '',
  aiExperience: '',
  aiWishIn30Days: '',
  monthlyLeads: '',
  annualRevenue: 'prefer_not',
})

export const AUDIT_STORAGE_KEY = 'shiloh-audit-draft'
