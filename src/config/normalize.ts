import { DEFAULT_PROJECT_SETTINGS } from './types'
import type { ProjectState } from './types'

export function normalizeWorkspaces(parsed: Partial<ProjectState>): ProjectState['workspaces'] {
  const rawEntries = Array.isArray(parsed.workspaces) ? parsed.workspaces : []

  return rawEntries.map((entry) => {
    const record = entry as unknown as Record<string, unknown>
    return {
      branch: String(record.branch ?? ''),
      folderName: String(record.folderName ?? record.folder ?? record.path ?? ''),
      goal: String(record.goal ?? '')
    }
  })
}

export function normalizeSettings(parsed: Partial<ProjectState>): ProjectState['settings'] {
  const record = (parsed.settings ?? {}) as Partial<ProjectState['settings']>

  return {
    json: typeof record.json === 'boolean' ? record.json : DEFAULT_PROJECT_SETTINGS.json,
    interactive: typeof record.interactive === 'boolean' ? record.interactive : DEFAULT_PROJECT_SETTINGS.interactive
  }
}
