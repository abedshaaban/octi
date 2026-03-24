import fs from 'node:fs/promises'
import path from 'node:path'
import {
  detectDefaultBranchFromRemoteUrl,
  listRemoteBranchesFromUrl,
  resolveGitCommonDir
} from '../git/repo'
import { git } from '../git/exec'
import { saveConfig, saveState } from '../config/save'
import type { ProjectConfig, ProjectState } from '../config/types'
import { promptSelect } from '../utils/prompt'

export interface CloneProjectInput {
  repoUrl: string
  cwd: string
}

export interface CloneProjectResult {
  projectRoot: string
  workspacePath: string
  defaultBranch: string
}

function inferProjectNameFromUrl(repoUrl: string): string {
  try {
    const url = new URL(repoUrl)
    const pathname = url.pathname.replace(/\/+$/, '')
    const last = pathname.split('/').filter(Boolean).pop() ?? 'project'
    return last.replace(/\.git$/i, '') || 'project'
  } catch {
    if (!repoUrl.includes('/')) {
      throw new Error('invalid repo URL')
    }
    const withoutTrailingSlash = repoUrl.replace(/\/+$/, '')
    const last = withoutTrailingSlash.split('/').filter(Boolean).pop() ?? 'project'
    return last.replace(/\.git$/i, '') || 'project'
  }
}

export async function cloneProject(input: CloneProjectInput): Promise<CloneProjectResult> {
  const { repoUrl, cwd } = input

  const projectName = inferProjectNameFromUrl(repoUrl)
  const projectRoot = path.join(cwd, projectName)

  try {
    await fs.mkdir(projectRoot)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('target project folder already exists')
    }
    throw error
  }

  const entries = await fs.readdir(projectRoot)
  if (entries.length > 0) {
    throw new Error('target folder is not empty')
  }

  const remoteBranches = await listRemoteBranchesFromUrl(repoUrl)
  if (remoteBranches.length === 0) {
    throw new Error('no remote branches found')
  }

  const detectedRemoteDefault = await detectDefaultBranchFromRemoteUrl(repoUrl)
  const preferredDefault = remoteBranches.includes('main')
    ? 'main'
    : detectedRemoteDefault && remoteBranches.includes(detectedRemoteDefault)
      ? detectedRemoteDefault
      : remoteBranches[0]!

  const defaultBranch = await promptSelect(
    'Select your default base branch for new workspaces',
    remoteBranches,
    preferredDefault
  )

  const workspaceDir = path.join(projectRoot, defaultBranch)
  await git(['clone', '--verbose', '--progress', '-b', defaultBranch, repoUrl, workspaceDir], {
    cwd: projectRoot,
    inheritStdio: true
  })

  const commonDir = await resolveGitCommonDir(workspaceDir)
  await git(['fetch', '--verbose', '--progress', 'origin'], { gitDir: commonDir, inheritStdio: true })

  const config: ProjectConfig = {
    version: 1,
    projectName,
    remote: 'origin',
    defaultBaseBranch: defaultBranch
  }

  const state: ProjectState = {
    defaultBaseBranch: defaultBranch,
    workspaces: [
      {
        branch: defaultBranch,
        folderName: defaultBranch,
        goal: 'Initial default workspace'
      }
    ]
  }

  await saveConfig(projectRoot, config)
  await saveState(projectRoot, state)

  return {
    projectRoot,
    workspacePath: workspaceDir,
    defaultBranch
  }
}
