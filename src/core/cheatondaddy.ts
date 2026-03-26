import fs from 'node:fs/promises'
import path from 'node:path'
import { loadState } from '../config/load'
import { isPrimaryWorktree, removeWorktree, resolveGitCommonDirFromState } from '../git/repo'
import { findProjectRoot } from '../utils/findProjectRoot'

export interface CheatOnDaddyInput {
  cwd: string
}

export interface CheatOnDaddyResult {
  projectRoot: string
  restoredBranch: string
  removedWorkspaces: Array<string>
}

export async function cheatOnDaddy(input: CheatOnDaddyInput): Promise<CheatOnDaddyResult> {
  const { cwd } = input
  const projectRoot = findProjectRoot(cwd)
  if (!projectRoot) {
    throw new Error('not inside a gitmedaddy project')
  }

  const state = await loadState(projectRoot)
  const restoredBranch = state.defaultBaseBranch
  const restoredWorkspace = state.workspaces.find((workspace) => workspace.branch === restoredBranch)
  if (!restoredWorkspace) {
    throw new Error(`default base branch "${restoredBranch}" is not currently displayed`)
  }

  const stateDir = path.join(projectRoot, 'state')
  const gitDir = await resolveGitCommonDirFromState(projectRoot, state)
  const restoredWorkspacePath = path.join(projectRoot, restoredWorkspace.folderName)

  const removedWorkspaces: Array<string> = []
  for (const workspace of state.workspaces) {
    const workspacePath = path.join(projectRoot, workspace.folderName)
    const isPrimary = workspace.folderName === '.' || (await isPrimaryWorktree(gitDir, workspacePath))
    if (workspace.branch === restoredBranch || isPrimary) continue

    await removeWorktree(gitDir, workspacePath)
    removedWorkspaces.push(workspace.branch)
  }

  if (restoredWorkspace.folderName !== '.') {
    const entries = await fs.readdir(restoredWorkspacePath)
    for (const name of entries) {
      await fs.rename(path.join(restoredWorkspacePath, name), path.join(projectRoot, name))
    }
    await fs.rm(restoredWorkspacePath, { recursive: true, force: true })
  }

  await fs.rm(stateDir, { recursive: true, force: true })

  return {
    projectRoot,
    restoredBranch,
    removedWorkspaces
  }
}
