/**
 * Default Composio tool slugs for workflow nodes.
 * Override per node via `composioToolName` in WorkflowNodeConfig.
 * Verify names in Composio dashboard if execution fails.
 */
export const COMPOSIO_WORKFLOW_DEFAULT_TOOLS = {
  smsSend: 'SMS_ALERT_SEND_SMS',
  retellPhoneCall: 'RETELLAI_CREATE_PHONE_CALL',
  mailchimpSend: 'MAILCHIMP_SEND_EMAIL',
  lemlistSend: 'LEMLIST_SEND_EMAIL',
} as const
