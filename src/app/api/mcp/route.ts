import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { createInternalMCPServer } from '@/mastra/mcp/internalServer'

/**
 * Streamable-HTTP-style MCP endpoint for the internal MCP server.
 *
 * Next.js App Router hands us a WHATWG `Request`, not a Node
 * `http.IncomingMessage`, so we can't forward directly to
 * `MCPServer.startHTTP`. Instead we implement the subset of JSON-RPC the MCP
 * protocol needs — `initialize`, `tools/list`, `tools/call` — on top of
 * `server.getToolListInfo()` and `server.executeTool()`. This is the same
 * surface `handleServerlessRequest` exposes internally, minus the Node
 * stream adapter.
 *
 * Tenant auth is enforced per-request via Clerk → Convex user lookup, and the
 * server instance is built fresh for each request so Composio/Convex clients
 * are always scoped to the caller.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: unknown
}

function rpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
  data?: unknown
) {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code, message, ...(data !== undefined ? { data } : {}) },
    },
    { status: 200 }
  )
}

function rpcResult(
  id: string | number | null | undefined,
  result: unknown
) {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id: id ?? null,
      result,
    },
    { status: 200 }
  )
}

async function resolveTenant(
  clerkUserId: string
): Promise<{ userId: string; tenantId: string } | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return null
  try {
    const client = new ConvexHttpClient(url)
    const dbUser = await client.query(api.users.getUserByClerkUserId, {
      clerkUserId,
    })
    if (!dbUser) return null
    return { userId: clerkUserId, tenantId: String(dbUser.tenantId) }
  } catch (err) {
    console.warn('[api/mcp] tenant resolve failed', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return rpcError(null, -32001, 'Unauthorized')
  }

  const ctx = await resolveTenant(clerkUserId)
  if (!ctx) {
    return rpcError(null, -32002, 'Tenant not found for user')
  }

  let body: JsonRpcRequest
  try {
    body = (await req.json()) as JsonRpcRequest
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

  const { id, method, params } = body
  if (!method) return rpcError(id, -32600, 'Invalid Request: missing method')

  try {
    const server = await createInternalMCPServer(ctx)

    if (method === 'initialize') {
      return rpcResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: server.name,
          version: server.version,
        },
      })
    }

    if (method === 'tools/list') {
      const { tools } = server.getToolListInfo()
      return rpcResult(id, { tools })
    }

    if (method === 'tools/call') {
      const p = (params ?? {}) as {
        name?: string
        arguments?: Record<string, unknown>
      }
      if (!p.name) return rpcError(id, -32602, 'Invalid params: name required')
      try {
        const result = await server.executeTool(p.name, p.arguments ?? {})
        return rpcResult(id, {
          content: [
            {
              type: 'text',
              text:
                typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
          structuredContent:
            typeof result === 'object' && result !== null ? result : undefined,
          isError: false,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return rpcResult(id, {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        })
      }
    }

    return rpcError(id, -32601, `Method not found: ${method}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return rpcError(id, -32603, 'Internal server error', message)
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        'This endpoint speaks JSON-RPC 2.0 over POST. Use "tools/list" or "tools/call".',
    },
    { status: 405 }
  )
}
