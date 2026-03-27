import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { assertSuperAdmin } from '@/middleware/adminGuard'
import {
  aiGatewayReportRequiredRangeMessage,
  parseAiGatewayCredentialType,
  parseAiGatewayReportDatePart,
  parseAiGatewayReportGroupBy,
  readAiGatewayReportQueryParam,
} from '@/constants/aiGatewayReportingApi'
import { fetchAiGatewayUsageReport } from '@/lib/aiGatewayReporting'

/**
 * Super-admin proxy to Vercel AI Gateway Custom Reporting API.
 * Query keys: see AiGatewayReportQueryParam (snake_case API + camelCase aliases where defined).
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    assertSuperAdmin(userId)

    const sp = req.nextUrl.searchParams
    const startDate = readAiGatewayReportQueryParam(sp, 'startDate')
    const endDate = readAiGatewayReportQueryParam(sp, 'endDate')
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: aiGatewayReportRequiredRangeMessage() },
        { status: 400 }
      )
    }

    const report = await fetchAiGatewayUsageReport({
      startDate,
      endDate,
      groupBy: parseAiGatewayReportGroupBy(readAiGatewayReportQueryParam(sp, 'groupBy')),
      datePart: parseAiGatewayReportDatePart(readAiGatewayReportQueryParam(sp, 'datePart')),
      userId: readAiGatewayReportQueryParam(sp, 'userId') ?? undefined,
      model: readAiGatewayReportQueryParam(sp, 'model') ?? undefined,
      tags: readAiGatewayReportQueryParam(sp, 'tags') ?? undefined,
      credentialType: parseAiGatewayCredentialType(
        readAiGatewayReportQueryParam(sp, 'credentialType')
      ),
      provider: readAiGatewayReportQueryParam(sp, 'provider') ?? undefined,
    })

    return NextResponse.json(report)
  } catch (err) {
    if (err instanceof Response) throw err
    const msg = err instanceof Error ? err.message : 'Failed to fetch AI Gateway report'
    console.error('[admin/ai-gateway-usage]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
