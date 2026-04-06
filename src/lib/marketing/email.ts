import { Resend } from 'resend'
import { bookCallUrl, getMarketingSiteUrl } from '@/lib/marketing/site'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildAuditEmailHtml(opts: {
  name: string
  reportUrl: string
  bookUrl: string
}): string {
  const name = escapeHtml(opts.name)
  const reportUrl = escapeHtml(opts.reportUrl)
  const bookUrl = escapeHtml(opts.bookUrl)
  const site = escapeHtml(getMarketingSiteUrl())
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;background:#0a0a0c;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
    <tr><td>
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#a78bfa;">Shiloh AI</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#fafafa;">Your AI Audit is ready</h1>
      <p style="margin:0 0 16px;color:#a3a3a3;">Hi ${name},</p>
      <p style="margin:0 0 16px;color:#a3a3a3;">Thanks for completing the questionnaire. Your personalized AI Audit Report is ready — open the link below to view or download it.</p>
      <p style="margin:24px 0;">
        <a href="${reportUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600;">Download your report</a>
      </p>
      <p style="margin:0 0 16px;color:#a3a3a3;">Want to go deeper? Book a strategy call — we’ll walk through your biggest automation wins.</p>
      <p style="margin:0 0 24px;">
        <a href="${bookUrl}" style="display:inline-block;border:1px solid rgba(255,255,255,0.15);color:#fafafa;text-decoration:none;padding:12px 24px;border-radius:9999px;">Book a strategy call</a>
      </p>
      <p style="margin:0;font-size:12px;color:#737373;">${site}</p>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Lead notification ────────────────────────────────────────────────────────

const LEAD_NOTIFY_TO =
  process.env.LEAD_NOTIFY_EMAIL ?? 'elijah@shiloh.sh'

function buildLeadNotificationHtml(opts: {
  name?: string
  email?: string
  phone?: string
  company?: string
  useCase?: string
}): string {
  const rows = [
    opts.name && `<tr><td style="color:#a3a3a3;padding:4px 0;width:90px">Name</td><td style="color:#fafafa;padding:4px 0">${escapeHtml(opts.name)}</td></tr>`,
    opts.email && `<tr><td style="color:#a3a3a3;padding:4px 0">Email</td><td style="color:#fafafa;padding:4px 0"><a href="mailto:${escapeHtml(opts.email)}" style="color:#a78bfa">${escapeHtml(opts.email)}</a></td></tr>`,
    opts.phone && `<tr><td style="color:#a3a3a3;padding:4px 0">Phone</td><td style="color:#fafafa;padding:4px 0">${escapeHtml(opts.phone)}</td></tr>`,
    opts.company && `<tr><td style="color:#a3a3a3;padding:4px 0">Company</td><td style="color:#fafafa;padding:4px 0">${escapeHtml(opts.company)}</td></tr>`,
    opts.useCase && `<tr><td style="color:#a3a3a3;padding:4px 0">Use case</td><td style="color:#fafafa;padding:4px 0">${escapeHtml(opts.useCase)}</td></tr>`,
  ].filter(Boolean).join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0a0a0c;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
    <tr><td>
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a78bfa;">Shiloh AI</p>
      <h1 style="margin:0 0 16px;font-size:18px;color:#fafafa;">New website lead</h1>
      <p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;">Someone reached out via the chat widget on shiloh.sh.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;margin-top:4px;">
        ${rows}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendLeadNotificationEmail(opts: {
  name?: string
  email?: string
  phone?: string
  company?: string
  useCase?: string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return

  const from =
    process.env.RESEND_FROM_EMAIL ?? 'Shiloh AI <onboarding@resend.dev>'
  const resend = new Resend(key)

  const displayName = opts.name || opts.email || opts.phone || 'Someone'
  const subject = `New lead: ${displayName}${opts.company ? ` (${opts.company})` : ''}`

  const { error } = await resend.emails.send({
    from,
    to: LEAD_NOTIFY_TO,
    subject,
    html: buildLeadNotificationHtml(opts),
  })

  if (error) {
    console.error('[lead-notify] Email failed:', error.message)
  }
}

// ─── Audit report ─────────────────────────────────────────────────────────────

export async function sendAuditReportEmail(opts: {
  to: string
  name: string
  reportUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }
  const from =
    process.env.RESEND_FROM_EMAIL ?? 'Shiloh AI <onboarding@resend.dev>'
  const resend = new Resend(key)
  const bookUrl = bookCallUrl()
  const html = buildAuditEmailHtml({
    name: opts.name,
    reportUrl: opts.reportUrl,
    bookUrl,
  })
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: 'Your personalized AI Audit Report is ready',
    html,
  })
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
