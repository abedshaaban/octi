import fs from 'node:fs/promises'
import path from 'node:path'
import { listRemoteBranches, resolveGitCommonDir } from '../git/repo'
import { promptInput, promptSelect } from '../utils/prompt'
import { normalizeSettings, normalizeWorkspaces } from './normalize'
import { saveState } from './save'
import type { InvalidProjectStateError } from './errors'
import type { ProjectState } from './types'

async function resolveGitDirForRepair(
  projectRoot: string,
  workspaces: ProjectState['workspaces']
): Promise<string | null> {
  for (const workspace of workspaces) {
    const cwd = path.join(projectRoot, workspace.folderName)
    try {
      await fs.access(path.join(cwd, '.git'))
    } catch {
      continue
    }
    return resolveGitCommonDir(cwd)
  }

  return null
}

async function promptForDefaultBaseBranch(projectRoot: string, parsed: Partial<ProjectState>): Promise<string> {
  const normalizedWorkspaces = normalizeWorkspaces(parsed)
  const gitDir = await resolveGitDirForRepair(projectRoot, normalizedWorkspaces)

  if (gitDir) {
    const remoteBranches = await listRemoteBranches(gitDir)
    if (remoteBranches.length > 0) {
      const defaultValue = remoteBranches.includes('main') ? 'main' : remoteBranches[0]!
      return promptSelect('Select default base branch for this project', remoteBranches, defaultValue)
    }
  }

  return promptInput('Enter the default base branch for this project', 'main')
}

export async function repairInvalidProjectState(
  error: InvalidProjectStateError,
  interactive: boolean
): Promise<boolean> {
  if (!interactive || !error.issues.some((issue) => issue.repairable)) {
    return false
  }

  const statePath = path.join(error.projectRoot, 'state', 'branches.json')

  let parsed: Partial<ProjectState>
  try {
    const raw = await fs.readFile(statePath, 'utf8')
    parsed = JSON.parse(raw) as Partial<ProjectState>
  } catch {
    return false
  }

  const nextState: ProjectState = {
    defaultBaseBranch:
      typeof parsed.defaultBaseBranch === 'string' && parsed.defaultBaseBranch.trim() !== ''
        ? parsed.defaultBaseBranch
        : await promptForDefaultBaseBranch(error.projectRoot, parsed),
    settings: normalizeSettings(parsed),
    workspaces: normalizeWorkspaces(parsed)
  }

  await saveState(error.projectRoot, nextState)
  return true
}
