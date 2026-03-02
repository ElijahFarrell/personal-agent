import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/middleware/tenantContext'
import { indexContextDoc, removeContextDoc } from '@/services/contextService'
import type { ResourceScope } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantContext()
    const body = await req.json()
    const { docId, title, content, category, scope } = body as {
      docId: string
      title: string
      content: string
      category: string
      scope?: ResourceScope
    }

    if (!docId || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await indexContextDoc({
      id: docId,
      tenantId,
      scope: scope ?? 'org',
      userId: scope === 'user' ? userId : undefined,
      title,
      content,
      category,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Context Index] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext()
    const body = await req.json()
    const { docId } = body

    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 })
    }

    await removeContextDoc(tenantId, docId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Context Index] Delete error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
