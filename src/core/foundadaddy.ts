import fs from 'node:fs/promises'
import path from 'node:path'
import { git } from '../git/exec'
import {
  createWorktree,
  detectDefaultBranch,
  ensureLocalBranch,
  fetchLatest,
  listRemoteBranches,
  resolveGitCommonDir
} from '../git/repo'
import { saveState } from '../config/save'
import { promptSelect } from '../utils/prompt'
import { branchToFolderSlug } from '../utils/slug'
import type { ProjectSettings, ProjectState } from '../config/types'

/** Move every top-level entry under `projectRoot` into `projectRoot/subfolderName`, matching `gmd clone` layout. */
async function relocateProjectIntoBranchFolder(projectRoot: string, subfolderName: string): Promise<string> {
  const workspacePath = path.join(projectRoot, subfolderName)

  try {
    await fs.mkdir(workspacePath, { recursive: false })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`workspace folder "${subfolderName}" already exists`)
    }
    throw error
  }

  const entries = await fs.readdir(projectRoot)
  for (const name of entries) {
    if (name === subfolderName) continue
    await fs.rename(path.join(projectRoot, name), path.join(workspacePath, name))
  }

  return workspacePath
}

export interface FoundADaddyInput {
  cwd: string
  interactive: boolean
  settings: ProjectSettings
}

export interface FoundADaddyResult {
  projectRoot: string
  workspacePath: string
  defaultBaseBranch: string
}

export async function foundADaddy(input: FoundADaddyInput): Promise<FoundADaddyResult> {
  const { cwd, interactive, settings } = input

  const { stdout } = await git(['rev-parse', '--show-toplevel'], { cwd })
  const projectRoot = stdout.trim()
  if (!projectRoot) {
    throw new Error('not inside a git repository')
  }

  const branchesPath = path.join(projectRoot, 'state', 'branches.json')
  try {
    await fs.access(branchesPath)
    throw new Error('gmd is already initialized in this repository')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  const commonDir = await resolveGitCommonDir(cwd)

  await fetchLatest(commonDir, { inheritStdio: interactive })

  const detectedDefaultBranch = await detectDefaultBranch(commonDir)
  const remoteBranches = await listRemoteBranches(commonDir)
  if (remoteBranches.length === 0) {
    throw new Error('no remote branches found')
  }
  const preferredDefault = remoteBranches.includes('main')
    ? 'main'
    : remoteBranches.includes(detectedDefaultBranch)
      ? detectedDefaultBranch
      : remoteBranches[0]!

  const defaultBaseBranch = interactive
    ? await promptSelect('Select your default base branch for new workspaces', remoteBranches, preferredDefault)
    : preferredDefault

  const { stdout: headOut } = await git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectRoot })
  const currentBranch = headOut.trim()

  if (currentBranch === 'HEAD') {
    throw new Error('cannot initialize from a detached HEAD; check out a branch first')
  }

  const currentWorkspaceFolderName = branchToFolderSlug(currentBranch)
  const workspacePath = await relocateProjectIntoBranchFolder(projectRoot, currentWorkspaceFolderName)

  const relocatedCommonDir = await resolveGitCommonDir(workspacePath)
  await ensureLocalBranch(relocatedCommonDir, defaultBaseBranch, defaultBaseBranch, true)

  const workspaces: ProjectState['workspaces'] = [
    {
      branch: currentBranch,
      folderName: currentWorkspaceFolderName,
      goal: ''
    }
  ]

  if (currentBranch !== defaultBaseBranch) {
    const defaultWorkspaceFolderName = branchToFolderSlug(defaultBaseBranch)
    const defaultWorkspacePath = path.join(projectRoot, defaultWorkspaceFolderName)
    try {
      await fs.mkdir(defaultWorkspacePath, { recursive: false })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error(`workspace folder "${defaultWorkspaceFolderName}" already exists`)
      }
      throw error
    }
    await createWorktree(relocatedCommonDir, defaultWorkspacePath, defaultBaseBranch)
    workspaces.push({
      branch: defaultBaseBranch,
      folderName: defaultWorkspaceFolderName,
      goal: ''
    })
  }

  const state: ProjectState = {
    defaultBaseBranch,
    settings,
    workspaces
  }

  await saveState(projectRoot, state)

  return {
    projectRoot,
    workspacePath,
    defaultBaseBranch
  }
}
