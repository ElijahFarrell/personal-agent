import chokidar from 'chokidar'
import path from 'path'
import { indexSkills } from './skillRetriever'

const SKILLS_DIR = path.join(process.cwd(), 'skills')

let watcher: ReturnType<typeof chokidar.watch> | null = null
let reindexTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleReindex(tenantId: string, filePath: string): void {
  if (reindexTimeout) clearTimeout(reindexTimeout)
  reindexTimeout = setTimeout(async () => {
    console.log(`[SkillWatcher] Change detected: ${filePath} — reindexing skills...`)
    try {
      await indexSkills(tenantId)
      console.log('[SkillWatcher] Skills reindexed successfully.')
    } catch (error) {
      console.error('[SkillWatcher] Reindex failed:', error)
    }
  }, 500)
}

export function startSkillWatcher(tenantId = 'default'): void {
  if (watcher) return

  watcher = chokidar.watch(`${SKILLS_DIR}/**/*.md`, {
    ignoreInitial: true,
    persistent: true,
  })

  watcher
    .on('add', (filePath) => scheduleReindex(tenantId, filePath))
    .on('change', (filePath) => scheduleReindex(tenantId, filePath))
    .on('unlink', (filePath) => scheduleReindex(tenantId, filePath))

  console.log(`[SkillWatcher] Watching ${SKILLS_DIR} for changes...`)
}

export function stopSkillWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
