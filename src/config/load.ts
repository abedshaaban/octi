import fs from 'node:fs/promises'
import path from 'node:path'
import { InvalidProjectStateError } from './errors'
import { normalizeSettings, normalizeWorkspaces } from './normalize'
import type { ProjectStateIssue } from './errors'
import type { ProjectState } from './types'

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
