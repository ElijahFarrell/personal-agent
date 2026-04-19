# Agentic orchestration — rules of thumb for this repo

A focused design doc for how we build, wire, and constrain agents in this
application. Every recommendation below is grounded in a file path in this
repo — no generic theory. Read this before adding a new agent, a new tool,
or a new long-running integration.

> **TL;DR**
>
> - Supervisor ≤ 20 tools, ≤ 15 sub-agents.
> - Sub-agent ≤ 8 tools, single domain.
> - Any tool with p90 > 20s either (a) has a tight internal cap and returns
>   partial results, or (b) is a Convex worker with a `runId` handoff.
> - Every list/search/get trio collapses to one router tool with an
>   `action` enum. See `runs`, `schedules`, `prospects-query`.
> - Every bulk result persists as an artifact on completion; follow-ups
>   use `artifacts-get` instead of re-running the tool.
> - `mem0` is for durable one-line facts. Working memory is for session
>   state. Artifacts are for bulk data. They are not interchangeable.

---

## 1. Hard constraints we actually hit

### 1a. LLM tool-selection degrades past ~20 tools

Empirically, when an agent is given > ~20 tools the model starts picking
the wrong one, inventing arguments, or asking the user to pick from a
list. This is the single biggest orchestration bug we see.

Where we enforce it now:

- [`src/mastra/tools/runTools.ts`](../src/mastra/tools/runTools.ts) — the
  `runs` router tool replaces `runs-get-status`, `runs-list-recent`, and
  `runs-cancel`. One tool, one `action` enum.
- [`src/mastra/tools/agentTools.ts`](../src/mastra/tools/agentTools.ts) —
  the `schedules` router replaces `list-schedules`, `toggle-schedule`,
  `delete-schedule`. `create-schedule` stays separate because creation is
  a high-intent mutation that deserves its own LLM surface.
- [`src/mastra/tools/prospectTools.ts`](../src/mastra/tools/prospectTools.ts) —
  the `prospects-query` router replaces `list-prospects`,
  `search-prospects`, and `get-prospect`. Create/update stay separate.

Rule we are enforcing going forward: **any three read-only tools that
share a domain collapse to one router.** Do not ship a fourth sibling CRUD
tool.

### 1b. Vercel stream budget is 300 seconds

The chat route is [`src/app/api/chat/route.ts`](../src/app/api/chat/route.ts)
with `maxDuration = 300`. Anything that blocks for longer crashes the
stream mid-answer. The two legitimate escape hatches are:

1. **Synchronous with an internal cap**: the tool awaits its upstream but
   clamps the wait well inside the budget and returns partial results on
   timeout. See
   [`src/services/exaWebsetsService.ts`](../src/services/exaWebsetsService.ts)
   (`WEBSET_TIMEOUT_MS = 260_000`, leaving a 40s safety margin) and the
   matching caller in
   [`src/mastra/agents/sdrAgent.ts`](../src/mastra/agents/sdrAgent.ts)
   (`EXA_SYNC_WAIT_MS = 260_000`).
2. **Durable worker + `runId` handoff**: the tool schedules a Convex
   internal action, returns `{ runId, status: 'running' }` immediately,
   and the worker writes the result back to the chat thread as a
   follow-up. See
   [`convex/agentWorkers.ts`](../convex/agentWorkers.ts)
   (`runExaWebset` + `pollExaWebset` + `finalize`) and the hourly cron in
   [`convex/crons.ts`](../convex/crons.ts) that fan-fetches past websets
   without touching the chat budget.

The Exa webset search uses approach (1) — the product requirement is
that the user waits in the same turn. The hourly sync job uses approach
(2) because it runs outside of any chat stream.

### 1c. Polling vs durable execution

Rule of thumb: **never poll a third-party API from a tool-call inside a
chat stream**. Poll from a Convex action with self-rescheduling
(`ctx.scheduler.runAfter`) the way
[`convex/agentWorkers.ts`](../convex/agentWorkers.ts) does. Tools inside
the chat path either return quickly, cap and return partial, or hand off
a `runId` and let the durable path finish the work.

---

## 2. Mastra-specific patterns we are using correctly

Don't change these. They are doing the job:

- **Single supervisor with `agents: {...}`** —
  [`src/mastra/agents/orchestrator.ts`](../src/mastra/agents/orchestrator.ts)
  builds one `Agent` with a sub-agent registry keyed by
  `agent-<id>`. The Mastra model auto-generates one delegation tool per
  sub-agent.
- **`messageFilter` context isolation** — sub-agents do not receive the
  whole chat history by default. They see the message the orchestrator
  explicitly delegated.
- **Delegation hooks → Convex audit trail** —
  `onDelegationStart` / `onDelegationComplete` in `orchestrator.ts` write
  rows into the `delegations` table. That is what feeds the `runs` router
  and the dashboard.
- **Per-agent memory** — each sub-agent owns its working memory through
  [`src/mastra/memory.ts`](../src/mastra/memory.ts). The orchestrator's
  memory is separate and scoped to thread-level state (last webset id,
  last artifact id, current campaign).
- **Workspace/skill gating** —
  [`src/platform/niche/types.ts`](../src/platform/niche/types.ts) drives
  `effectiveAllowedAgents` which
  [`src/mastra/agents/orchestrator.ts`](../src/mastra/agents/orchestrator.ts)
  checks before adding each sub-agent to the registry. A disabled
  platform does not leak its agent into the supervisor's tool list.

---

## 3. Rules of thumb mapped to this repo

### 3a. Supervisor: ≤ 20 tools, ≤ 15 sub-agents

Current orchestrator tools after the refactor
([`src/mastra/agents/orchestrator.ts`](../src/mastra/agents/orchestrator.ts)
`tools:{}` block):

| Bucket | Tools |
| --- | --- |
| Search | `webSearch`, `deepSearch` |
| Memory | `mem0Memorize`, `mem0Recall` |
| Runs / artifacts | `runs` (router), `artifacts-get`, `write-plan` |
| Schedules | `create-schedule`, `schedules` (router) |
| Prospects | `prospects-query` (router), `create-prospect`, `update-prospect` |
| Workspace | `create-workspace`, `list-workspaces`, … |
| Workflows | `build-workflow`, `run-workflow` |
| Websets | `list-recent-websets` (shared via `createWebsetTools`) |
| Connections | `get-connection-status` |

That is ~20 tools total, down from ~35 before the refactor, and all the
low-frequency read tools have been consolidated.

Sub-agent count is gated by `effectiveAllowedAgents`. The largest
platform config exposes ~13 sub-agents today; we do not anticipate
pushing past 15.

### 3b. Sub-agent: ≤ 8 tools, single domain

This is the rule we broke with the original SDR agent. It was doing
company-search (Exa) AND people-search (Apollo) AND sending (Outlook) in
one bag, and the prompt lied about which tools it actually had. The fix:

- **`agent-sdr`** is Exa-only now (4 tools):
  `runExaWebsetSearch`, `fetchExaWebsetById`, `addExaResultsToProspects`,
  `addExaWebsetToProspects`, plus the shared `list-recent-websets`. See
  [`src/mastra/agents/sdrAgent.ts`](../src/mastra/agents/sdrAgent.ts).
- **`agent-lead`** owns Apollo + Outlook. See
  [`src/mastra/agents/leadAgent.ts`](../src/mastra/agents/leadAgent.ts).
  It also gets `list-recent-websets` so it can bulk-enrich a cached
  company list without re-hitting Exa.

If a sub-agent grows past 8 tools, split it.

### 3c. Any tool p90 > 20s → either cap-and-partial or Convex worker

Two contracts we use today:

**Cap-and-partial (chat-bound):**

```ts
// src/mastra/agents/sdrAgent.ts
const wait = await waitForWebsetResults(websetId, input.count, EXA_SYNC_WAIT_MS)
// wait.status: 'idle' | 'timeout' | 'error'
// On 'timeout', wait.results still contains whatever completed.
```

The tool's summary tells the LLM whether the result is complete or
partial so the LLM can be honest with the user:

```ts
// Paraphrased from the same file:
summary = wait.status === 'idle'
  ? `Webset ${websetId} complete — ${wait.results.length} of ${input.count} requested.`
  : wait.status === 'timeout'
    ? `Partial — returned ${wait.results.length} of ${input.count}; ` +
      `webset ${websetId} is still running on Exa's side. ` +
      `Fetch the rest via fetch-exa-webset-by-id.`
    : `Errored (${wait.error ?? 'unknown'}) — returning ${wait.results.length} partial.`
```

**Convex worker + `runId` (background):** use
[`convex/agentWorkers.ts`](../convex/agentWorkers.ts) as the template:
schedule `internal.<mod>.<action>` via `ctx.scheduler.runAfter(0, ...)`,
return `{ runId, status: 'running' }` from the tool, have the worker
call `api.agentRuns.finalize` which posts an assistant message +
artifact into the thread.

### 3d. Every list/search/get → one router tool

Already covered in §1a. The pattern:

```ts
createTool({
  id: 'prospects-query',
  inputSchema: z.object({
    action: z.enum(['list', 'search', 'get']),
    // action-specific fields, validated per-action via superRefine
  }).superRefine((val, ctx) => {
    if (val.action === 'search' && !val.query?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'search requires query', path: ['query'] })
    }
  }),
  execute: async (input) => {
    if (input.action === 'list') { /* … */ }
    if (input.action === 'search') { /* … */ }
    // default: get
  },
})
```

Live example:
[`src/mastra/tools/prospectTools.ts`](../src/mastra/tools/prospectTools.ts).

### 3e. Every long-running tool → artifact → `artifacts-get` on follow-up

Rule: a tool that produces > 1 KB of structured output writes an
artifact and returns the `artifactId` in its result envelope. Follow-up
asks ("add them to prospects", "email the first three") should call
`artifacts-get` instead of re-running the original tool.

See
[`src/mastra/tools/runTools.ts`](../src/mastra/tools/runTools.ts)
(`artifacts-get`) and the artifact schema in
[`convex/artifacts.ts`](../convex/artifacts.ts). The SDR tool's result
envelope always includes `artifactId` when a webset completes —
downstream tools consume that id instead of re-paging Exa.

---

## 4. Memory discipline

Three stores with three different jobs. Do not mix them.

| Store | Purpose | Where |
| --- | --- | --- |
| `mem0` | Durable one-line facts about the user ("works at Acme, prefers PT mornings") | [`src/mastra/tools/mem0Recall.ts`](../src/mastra/tools/mem0Recall.ts), [`src/mastra/tools/mem0Memorize.ts`](../src/mastra/tools/mem0Memorize.ts) |
| Working memory | Session state the agent needs during this thread (last webset id, current campaign id, draft subject) | [`src/mastra/memory.ts`](../src/mastra/memory.ts) |
| Artifacts | Bulk structured data produced by a tool run (50 companies, a CSV, a long research report) | [`convex/artifacts.ts`](../convex/artifacts.ts), [`src/mastra/tools/runTools.ts`](../src/mastra/tools/runTools.ts) |

Anti-patterns we've seen and guarded against in the prompt:

- **Dumping JSON into `mem0`**: `mem0` is for facts in natural language,
  not arrays. The orchestrator prompt explicitly warns against this.
- **Putting bulk data in working memory**: it re-enters the context
  window every turn and blows out tokens. Use an artifact and refer to it
  by id.
- **Re-running a long tool to "get the results again"**: if the tool
  returned an `artifactId`, use `artifacts-get`.

---

## 5. Delegation checklist

The orchestrator prompt
([`src/mastra/prompts/orchestrator.ts`](../src/mastra/prompts/orchestrator.ts))
already enforces "direct tools first" — the supervisor uses
`webSearch` / `deepSearch` / `mem0Recall` inline before delegating. Use
the flowchart below when adding a new capability:

```
Is it a single API call that returns in < 20s?
  └── Yes → Direct tool on the orchestrator.
  └── No →
      Does the capability need a multi-step conversation of its own
      (e.g. "find leads" → "qualify them" → "draft outreach")?
        └── Yes → Sub-agent with ≤ 8 focused tools.
        └── No → Direct tool on the orchestrator with cap-and-partial
                 or `runId` handoff.
```

Concrete examples:

- `webSearch` / `deepSearch` are direct tools, not sub-agents. They are
  one-shot reads with no follow-up state.
- `agent-sdr` and `agent-lead` are sub-agents because the flow is
  multi-step: search → filter → add to prospects → enrich → draft.
- `pullPastWebsets` is a Convex cron, not a tool. Nothing about it
  benefits from the LLM.

---

## 6. Async tools playbook

When you need to add a new tool whose p90 exceeds 20 seconds, pick one
of the two patterns below. Do not invent a third.

### Pattern A — Cap-and-partial (chat-bound)

Use when the user is actively waiting for the answer in the same turn.
Template lifted from
[`src/mastra/agents/sdrAgent.ts`](../src/mastra/agents/sdrAgent.ts):

```ts
const MAX_WAIT_MS = 260_000 // match the chat route's 300s maxDuration - 40s margin

createTool({
  id: 'my-slow-thing',
  description:
    'SYNCHRONOUS — awaits results up to 260s (the chat budget). ' +
    'Returns status: idle | timeout | error. Timeout returns partial results.',
  inputSchema: MyInputSchema,
  outputSchema: makeResultSchema(MyDataSchema),
  execute: async (input) => {
    const jobId = await startJob(input)
    const result = await pollWithCap(jobId, MAX_WAIT_MS)

    return {
      ok: true,
      data: { jobId, items: result.items, status: result.status },
      summary: result.status === 'idle'
        ? `Done — ${result.items.length} items.`
        : result.status === 'timeout'
          ? `Partial — ${result.items.length} so far; call fetch-my-thing-by-id with jobId="${jobId}" for the rest.`
          : `Errored (${result.error ?? 'unknown'}) — returning ${result.items.length} partial.`,
    }
  },
})
```

The prompt for the owning agent must tell the LLM to check `status` and
report partial results honestly. See
[`src/mastra/prompts/sdr.ts`](../src/mastra/prompts/sdr.ts) for the
working example.

### Pattern B — Convex worker + `runId` handoff (background)

Use when the user does not need to wait in the same turn (scheduled
jobs, bulk enrichment, overnight scraping). Template lifted from
[`convex/agentWorkers.ts`](../convex/agentWorkers.ts):

```ts
// convex/myWorker.ts
export const runMyJob = internalAction({
  args: { tenantId: v.id('tenants'), runId: v.id('agentRuns'), /* … */ },
  handler: async (ctx, args) => {
    const state = await startUpstream(args)
    await ctx.scheduler.runAfter(5000, internal.myWorker.pollMyJob, { ...args, state })
  },
})

export const pollMyJob = internalAction({
  args: { /* … */ state: v.any() },
  handler: async (ctx, args) => {
    const result = await pollUpstream(args.state)
    if (!result.done) {
      await ctx.scheduler.runAfter(5000, internal.myWorker.pollMyJob, args)
      return
    }
    await ctx.runMutation(api.agentRuns.finalize, {
      runId: args.runId,
      result: result.data,
      artifactKind: 'my-thing',
    })
  },
})
```

The tool's `execute` starts the run and returns immediately:

```ts
execute: async (input) => {
  const runId = await convex.mutation(api.agentRuns.start, { /* … */ })
  await convex.action(internal.myWorker.runMyJob, { runId, ...input })
  return {
    ok: true,
    data: { runId, status: 'running' },
    summary: `Started — I'll post the result in this thread when it's done. runId=${runId}.`,
  }
}
```

Follow-up asks use the `runs` router
([`src/mastra/tools/runTools.ts`](../src/mastra/tools/runTools.ts)) with
`action: 'get'` + `runId`.

---

## 7. Composio side-quest — generic Exa search only

Findings documented here so we don't re-evaluate them every quarter
([plan §Side-quest](/Users/jumpy/.cursor/plans/orchestration_refactor_+_sdr_fixes_c6aeb718.plan.md)):

- Composio's Exa toolkit covers generic search (`EXA_SEARCH`,
  `EXA_ANSWER`, `EXA_FIND_SIMILAR`, `EXA_GET_CONTENTS_ACTION`) and webset
  **creation** but **not** webset **read** (no list-all-websets, no
  list-items-in-webset). It also lacks typed `email`/`url` enrichment
  schemas.
- Conclusion: webset-based lead-gen stays on `exa-js`. Generic search
  (currently in
  [`src/services/searchService.ts`](../src/services/searchService.ts)
  `searchExa` / `searchExaDeep`) can optionally route through Composio
  behind a `COMPOSIO_EXA=1` feature flag to unify audit/logging with our
  other Composio-backed providers.
- The tool surface (`webSearchTool`, `deepSearchTool`) does not change —
  this is a backend swap. The LLM cannot tell the difference.

If Composio later exposes webset read endpoints, the same plumbing
extends there. Until then, no change.

---

## 8. Non-goals (say no to scope creep)

- Not replacing Mastra. The supervisor + delegation + memory primitives
  are correct; our bugs were all in how we wired them.
- Not splitting this app into a monorepo or extracting agents to
  separate services. The current boundaries are fine.
- Not touching the ads pipeline
  ([`src/mastra/workflows/adsIntelligencePipeline.ts`](../src/mastra/workflows/adsIntelligencePipeline.ts)) —
  it works today.
- Not rewriting the chat UI (background mode, SSE observer, milestone
  lines). The cap-and-partial and runId-handoff patterns are transparent
  to the frontend.

---

## 9. Quick checklist when adding a new tool or agent

Before you ship, answer these in the PR description:

- [ ] What's the p90 latency? If > 20s, which pattern (§6A or §6B)?
- [ ] Does this put the owning agent over 8 tools? If yes, split or
      consolidate first.
- [ ] Does this put the orchestrator over 20 tools? If yes, router-ify.
- [ ] If the output is > 1 KB structured data, does it produce an
      artifact? Does the prompt tell the LLM to use `artifacts-get` on
      follow-up?
- [ ] Are you writing to `mem0`? If so, is the write a one-line fact
      about the user? If it's bulk data, you want an artifact instead.
- [ ] Did you update the prompt for the owning agent? The LLM cannot use
      a tool it does not know about, and it will mis-use a tool with a
      stale description.
- [ ] Did you add a `CHAT_TOOL_UI` entry in
      [`src/constants/chatToolUi.ts`](../src/constants/chatToolUi.ts) so
      the chat shows a human-readable label?
