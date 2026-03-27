/** Widget IDs for the dashboard overview page. */
export const DASHBOARD_WIDGETS = {
  TODO_CHECKLIST: 'todo_checklist',
  STATS: 'stats',
  FINANCIAL_SUMMARY: 'financial_summary',
  WORKFLOW_RUNS: 'workflow_runs',
  TIME_SAVINGS: 'time_savings',
} as const

export type DashboardWidgetId =
  (typeof DASHBOARD_WIDGETS)[keyof typeof DASHBOARD_WIDGETS]

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  [DASHBOARD_WIDGETS.TODO_CHECKLIST]: "Today's checklist",
  [DASHBOARD_WIDGETS.STATS]: 'Quick stats',
  [DASHBOARD_WIDGETS.FINANCIAL_SUMMARY]: 'Financial summary',
  [DASHBOARD_WIDGETS.WORKFLOW_RUNS]: 'Recent workflow runs',
  [DASHBOARD_WIDGETS.TIME_SAVINGS]: 'Time savings',
}

/** Sub-metrics for the time savings widget (org/user can hide rows). */
export const TIME_SAVINGS_METRIC_IDS = {
  RESEARCH: 'research',
  OUTREACH: 'outreach',
  INBOX: 'inbox',
  PERSONALIZATION: 'personalization',
  VELOCITY: 'velocity',
  CHART: 'chart',
} as const

export type TimeSavingsMetricId =
  (typeof TIME_SAVINGS_METRIC_IDS)[keyof typeof TIME_SAVINGS_METRIC_IDS]

export const TIME_SAVINGS_METRIC_LABELS: Record<TimeSavingsMetricId, string> = {
  [TIME_SAVINGS_METRIC_IDS.RESEARCH]: 'Research time saved',
  [TIME_SAVINGS_METRIC_IDS.OUTREACH]: 'Outreach from platform',
  [TIME_SAVINGS_METRIC_IDS.INBOX]: 'Inbox replies',
  [TIME_SAVINGS_METRIC_IDS.PERSONALIZATION]: 'Personalization',
  [TIME_SAVINGS_METRIC_IDS.VELOCITY]: 'Pipeline velocity',
  [TIME_SAVINGS_METRIC_IDS.CHART]: 'Chart',
}

export const DEFAULT_TIME_SAVINGS_METRIC_IDS: TimeSavingsMetricId[] = [
  TIME_SAVINGS_METRIC_IDS.RESEARCH,
  TIME_SAVINGS_METRIC_IDS.OUTREACH,
  TIME_SAVINGS_METRIC_IDS.INBOX,
  TIME_SAVINGS_METRIC_IDS.PERSONALIZATION,
  TIME_SAVINGS_METRIC_IDS.VELOCITY,
  TIME_SAVINGS_METRIC_IDS.CHART,
]

export const DEFAULT_ENABLED_WIDGETS: DashboardWidgetId[] = [
  DASHBOARD_WIDGETS.TIME_SAVINGS,
  DASHBOARD_WIDGETS.TODO_CHECKLIST,
  DASHBOARD_WIDGETS.STATS,
  DASHBOARD_WIDGETS.WORKFLOW_RUNS,
]
