/**
 * Wraps a primary WorkflowsStorage and falls back to in-memory on any error.
 * Prevents 500s when Convex is down or the adapter fails.
 */
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
import { LibSQLStore } from '@mastra/libsql'

export class FallbackWorkflowsStorage extends WorkflowsStorage {
  private primary: WorkflowsStorage
  private fallback: WorkflowsStorage
  private fallbackStore: LibSQLStore

  constructor(primary: WorkflowsStorage) {
    super()
    this.primary = primary
    this.fallbackStore = new LibSQLStore({
      id: 'mastra-workflows-fallback',
      url: ':memory:',
    })
    this.fallback = this.fallbackStore.stores!.workflows
  }

  async init(): Promise<void> {
    await this.fallbackStore.init()
  }

  async dangerouslyClearAll(): Promise<void> {
    try {
      await this.primary.dangerouslyClearAll()
    } catch {
      await this.fallback.dangerouslyClearAll()
    }
  }

  private async withFallback<T>(
    fn: (store: WorkflowsStorage) => Promise<T>
  ): Promise<T> {
    try {
      return await fn(this.primary)
    } catch (err) {
      console.warn('[FallbackWorkflowsStorage] Primary failed, using :memory:', err)
      return await fn(this.fallback)
    }
  }

  async persistWorkflowSnapshot(args: {
    workflowName: string
    runId: string
    resourceId?: string
    snapshot: WorkflowRunState
    createdAt?: Date
    updatedAt?: Date
  }): Promise<void> {
    return this.withFallback((s) => s.persistWorkflowSnapshot(args))
  }

  async loadWorkflowSnapshot(args: {
    workflowName: string
    runId: string
  }): Promise<WorkflowRunState | null> {
    return this.withFallback((s) => s.loadWorkflowSnapshot(args))
  }

  async updateWorkflowResults(args: {
    workflowName: string
    runId: string
    stepId: string
    result: StepResult<unknown, unknown, unknown, unknown>
    requestContext: Record<string, unknown>
  }): Promise<Record<string, StepResult<unknown, unknown, unknown, unknown>>> {
    return this.withFallback((s) => s.updateWorkflowResults(args))
  }

  async updateWorkflowState(args: {
    workflowName: string
    runId: string
    opts: UpdateWorkflowStateOptions
  }): Promise<WorkflowRunState | undefined> {
    return this.withFallback((s) => s.updateWorkflowState(args))
  }

  async getWorkflowRunById(args: {
    runId: string
    workflowName?: string
  }): Promise<WorkflowRun | null> {
    return this.withFallback((s) => s.getWorkflowRunById(args))
  }

  async listWorkflowRuns(
    args?: StorageListWorkflowRunsInput
  ): Promise<WorkflowRuns> {
    return this.withFallback((s) => s.listWorkflowRuns(args))
  }

  async deleteWorkflowRunById(args: {
    runId: string
    workflowName: string
  }): Promise<void> {
    return this.withFallback((s) => s.deleteWorkflowRunById(args))
  }
}
