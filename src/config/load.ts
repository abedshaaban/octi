import fs from 'node:fs/promises'
import path from 'node:path'
import { InvalidProjectStateError  } from './errors'
import { DEFAULT_PROJECT_SETTINGS } from './types'
import type {ProjectStateIssue} from './errors';
import type { ProjectState } from './types'

function normalizeWorkspaces(parsed: Partial<ProjectState>): ProjectState['workspaces'] {
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

function normalizeSettings(parsed: Partial<ProjectState>): ProjectState['settings'] {
  const record = (parsed.settings ?? {}) as Partial<ProjectState['settings']>

  return {
    json: typeof record.json === 'boolean' ? record.json : DEFAULT_PROJECT_SETTINGS.json,
    interactive: typeof record.interactive === 'boolean' ? record.interactive : DEFAULT_PROJECT_SETTINGS.interactive
  }
}

function normalizeDefaultBaseBranch(parsed: Partial<ProjectState>): ProjectState['defaultBaseBranch'] {
  return parsed.defaultBaseBranch as ProjectState['defaultBaseBranch']
}

function validateParsedState(projectRoot: string, parsed: Partial<ProjectState>): void {
  const issues: Array<ProjectStateIssue> = []

  if (typeof parsed.defaultBaseBranch !== 'string' || parsed.defaultBaseBranch.trim() === '') {
    issues.push({
      path: 'defaultBaseBranch',
      message: 'must be a non-empty string',
      repairable: true
    })
  }

  if (issues.length > 0) {
    throw new InvalidProjectStateError(projectRoot, issues)
  }
}

export async function loadState(projectRoot: string): Promise<ProjectState> {
  const branchesStatePath = path.join(projectRoot, 'state', 'branches.json')
  const raw = await fs.readFile(branchesStatePath, 'utf8')
  let parsed: Partial<ProjectState>
  try {
    parsed = JSON.parse(raw) as Partial<ProjectState>
  } catch {
    throw new InvalidProjectStateError(projectRoot, [
      {
        path: 'state/branches.json',
        message: 'contains invalid JSON',
        repairable: false
      }
    ])
  }

  validateParsedState(projectRoot, parsed)

  return {
    defaultBaseBranch: normalizeDefaultBaseBranch(parsed),
    settings: normalizeSettings(parsed),
    workspaces: normalizeWorkspaces(parsed)
  }
}
