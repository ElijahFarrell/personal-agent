import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { marked } from 'marked'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { bookCallUrl } from '@/lib/marketing/site'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function markdownToHtml(md: string): Promise<string> {
  const result = marked(md)
  return typeof result === 'string' ? result : await result
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const { id } = await params
  const convex = new ConvexHttpClient(url)
  let doc
  try {
    doc = await convex.query(api.auditSubmissions.getById, {
      id: id as Id<'auditSubmissions'>,
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const book = escapeHtml(bookCallUrl())
  const name = escapeHtml(doc.name)
  const email = escapeHtml(doc.email)

  if (doc.reportMarkdown?.trim()) {
    const bodyHtml = await markdownToHtml(doc.reportMarkdown.trim())
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Audit — ${name}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #0a0a0c; color: #e5e5e5; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.65; }
    .wrap { max-width: 820px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .meta { color: #a3a3a3; font-size: 0.875rem; margin-bottom: 2rem; }
    article { font-size: 0.95rem; }
    article h1 { font-size: 1.75rem; font-weight: 700; color: #fafafa; margin: 0 0 1rem; }
    article h2 { font-size: 1.15rem; font-weight: 600; color: #fafafa; margin: 2rem 0 0.75rem; }
    article h3 { font-size: 1rem; font-weight: 600; color: #e5e5e5; margin: 1.5rem 0 0.5rem; }
    article p { margin: 0 0 0.75rem; }
    article ul, article ol { margin: 0 0 1rem; padding-left: 1.25rem; }
    article li { margin-bottom: 0.35rem; }
    article strong { color: #fafafa; }
    article a { color: #a78bfa; }
    article table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin: 1rem 0; }
    article th, article td { border: 1px solid rgba(255,255,255,0.1); padding: 0.5rem 0.6rem; text-align: left; }
    article th { background: rgba(255,255,255,0.03); color: #d4d4d8; }
    article hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 2rem 0; }
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: #737373; }
    .footer a { color: #a78bfa; }
  </style>
</head>
<body>
  <div class="wrap">
    <p class="meta">Prepared for ${email} · Shiloh</p>
    <article class="report-md">
        ${bodyHtml}
    </article>
    <p class="footer"><a href="${book}">Book a strategy call</a> · example.com | aios.example.com</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="shiloh-ai-audit-${id.slice(0, 8)}.html"`,
        'Cache-Control': 'private, no-store',
      },
    })
  }

  const tools = escapeHtml(doc.currentTools.join(', '))
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Audit — ${name}</title>
  <style>
    body { margin: 0; background: #0a0a0c; color: #e5e5e5; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.6; padding: 2rem; }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.5rem; color: #fafafa; margin-bottom: 0.5rem; }
    .muted { color: #a3a3a3; font-size: 0.875rem; margin-bottom: 2rem; }
    section { margin-bottom: 1.5rem; padding: 1rem 1.25rem; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.03); }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #a78bfa; margin: 0 0 0.5rem; }
    p { margin: 0; white-space: pre-wrap; }
    a { color: #a78bfa; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Your AI Audit snapshot</h1>
    <p class="muted">Submitted ${new Date(doc.submittedAt).toISOString()} · ${email}</p>
    <section><h2>About you</h2><p><strong>${name}</strong></p></section>
    <section><h2>Daily operations</h2><p>${escapeHtml(doc.topTasks)}</p></section>
    <section><h2>Tools & stack</h2><p>${tools}</p></section>
    <section><h2>Goals</h2><p>${escapeHtml(doc.aiWishIn30Days)}</p></section>
    <p class="muted">Full personalized analysis will be delivered by email. <a href="${book}">Book a call</a> to go deeper.</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="shiloh-ai-audit-${id.slice(0, 8)}.html"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
