/** Widget IDs for the dashboard overview page. */
export const DASHBOARD_WIDGETS = {
  TODO_CHECKLIST: 'todo_checklist',
  STATS: 'stats',
  FINANCIAL_SUMMARY: 'financial_summary',
  WORKFLOW_RUNS: 'workflow_runs',
} as const

export type DashboardWidgetId =
  (typeof DASHBOARD_WIDGETS)[keyof typeof DASHBOARD_WIDGETS]

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  [DASHBOARD_WIDGETS.TODO_CHECKLIST]: "Today's checklist",
  [DASHBOARD_WIDGETS.STATS]: 'Quick stats',
  [DASHBOARD_WIDGETS.FINANCIAL_SUMMARY]: 'Financial summary',
  [DASHBOARD_WIDGETS.WORKFLOW_RUNS]: 'Recent workflow runs',
}

export const DEFAULT_ENABLED_WIDGETS: DashboardWidgetId[] = [
  DASHBOARD_WIDGETS.TODO_CHECKLIST,
  DASHBOARD_WIDGETS.STATS,
  DASHBOARD_WIDGETS.WORKFLOW_RUNS,
]
