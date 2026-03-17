/**
 * Convex-backed WorkflowsStorage adapter for Mastra.
 * Stores workflow suspend/resume snapshots in Convex instead of LibSQL/Turso.
 */
import { ConvexHttpClient } from 'convex/browser'
import { WorkflowsStorage } from '@mastra/core/storage'
import type {
  WorkflowRunState,
  StepResult,
} from '@mastra/core/workflows'
import type {
  UpdateWorkflowStateOptions,
  WorkflowRun,
  WorkflowRuns,
  StorageListWorkflowRunsInput,
} from '@mastra/core/storage'
import { api } from '@convex/_generated/api'

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_CONVEX_URL is required for ConvexWorkflowsStorage'
    )
  }
  return new ConvexHttpClient(url)
}

export class ConvexWorkflowsStorage extends WorkflowsStorage {
  private convex: ConvexHttpClient

  constructor() {
    super()
    this.convex = getConvexClient()
  }

  async init(): Promise<void> {
    // Convex tables are created via schema - no init needed
  }

  async dangerouslyClearAll(): Promise<void> {
    await this.convex.mutation(api.workflowSnapshots.clearAll, {})
  }

  async persistWorkflowSnapshot(args: {
    workflowName: string
    runId: string
    resourceId?: string
    snapshot: WorkflowRunState
    createdAt?: Date
    updatedAt?: Date
  }): Promise<void> {
    await this.convex.mutation(api.workflowSnapshots.persist, {
      runId: args.runId,
      workflowName: args.workflowName,
      resourceId: args.resourceId,
      snapshot: JSON.stringify(args.snapshot),
      createdAt: args.createdAt?.getTime(),
      updatedAt: args.updatedAt?.getTime(),
    })
  }

  async loadWorkflowSnapshot(args: {
    workflowName: string
    runId: string
  }): Promise<WorkflowRunState | null> {
    const doc = await this.convex.query(api.workflowSnapshots.load, {
      workflowName: args.workflowName,
      runId: args.runId,
    })
    if (!doc) return null
    return JSON.parse(doc.snapshot) as WorkflowRunState
  }

  async updateWorkflowResults(args: {
    workflowName: string
    runId: string
    stepId: string
    result: StepResult<unknown, unknown, unknown, unknown>
    requestContext: Record<string, unknown>
  }): Promise<Record<string, StepResult<unknown, unknown, unknown, unknown>>> {
    const current = await this.loadWorkflowSnapshot({
      workflowName: args.workflowName,
      runId: args.runId,
    })
    if (!current) return {}

    const currentAny = current as unknown as Record<string, unknown>
    const context = (currentAny.context as Record<string, unknown>) ?? {}
    const stepResults = { ...(context.stepResults as Record<string, unknown> ?? {}), [args.stepId]: args.result }
    const updated = {
      ...current,
      context: { ...context, stepResults },
    } as unknown as WorkflowRunState

    await this.convex.mutation(api.workflowSnapshots.updateResults, {
      workflowName: args.workflowName,
      runId: args.runId,
      snapshotWithResults: JSON.stringify(updated),
    })
    return stepResults as Record<
      string,
      StepResult<unknown, unknown, unknown, unknown>
    >
  }

  async updateWorkflowState(args: {
    workflowName: string
    runId: string
    opts: UpdateWorkflowStateOptions
  }): Promise<WorkflowRunState | undefined> {
    const current = await this.loadWorkflowSnapshot({
      workflowName: args.workflowName,
      runId: args.runId,
    })
    if (!current) return undefined

    const updated: WorkflowRunState = {
      ...current,
      ...args.opts,
    } as WorkflowRunState

    await this.convex.mutation(api.workflowSnapshots.updateState, {
      workflowName: args.workflowName,
      runId: args.runId,
      snapshotPatch: JSON.stringify(updated),
    })
    return updated
  }

  async getWorkflowRunById(args: {
    runId: string
    workflowName?: string
  }): Promise<WorkflowRun | null> {
    const doc = await this.convex.query(api.workflowSnapshots.getById, {
      runId: args.runId,
      workflowName: args.workflowName,
    })
    if (!doc) return null
    return {
      workflowName: doc.workflowName,
      runId: doc.runId,
      snapshot: doc.snapshot,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
      resourceId: doc.resourceId,
    }
  }

  async listWorkflowRuns(
    listArgs?: StorageListWorkflowRunsInput
  ): Promise<WorkflowRuns> {
    const result = await this.convex.query(api.workflowSnapshots.list, {
      workflowName: listArgs?.workflowName,
      fromDate: listArgs?.fromDate?.getTime(),
      toDate: listArgs?.toDate?.getTime(),
      resourceId: listArgs?.resourceId,
      page: listArgs?.page,
      perPage: listArgs?.perPage,
    })
    return {
      runs: result.runs,
      total: result.total,
    }
  }

  async deleteWorkflowRunById(args: {
    runId: string
    workflowName: string
  }): Promise<void> {
    await this.convex.mutation(api.workflowSnapshots.deleteById, {
      runId: args.runId,
      workflowName: args.workflowName,
    })
  }
}
