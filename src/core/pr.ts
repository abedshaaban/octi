import path from 'node:path'
import { spawn } from 'node:child_process'
import { findProjectRoot } from '../utils/findProjectRoot'
import { loadState } from '../config/load'
import { git } from '../git/exec'
import type { ProjectState } from '../config/types'

export interface CreatePullRequestInput {
  cwd: string
  baseBranchOverride?: string | undefined
  titleOverride?: string | undefined
  draft?: boolean | undefined
  /** When true, passes `--assignee @me` to `gh pr create`. */
  assignSelf?: boolean | undefined
}

export interface CreatePullRequestResult {
  projectRoot: string
  branch: string
  baseBranch: string
  title: string
  url: string
}

function resolveCurrentWorkspaceBranch(projectRoot: string, cwd: string, state: ProjectState): string | null {
  const absoluteCwd = path.resolve(cwd)
  for (const workspace of state.workspaces) {
    const workspaceRoot = path.join(projectRoot, workspace.folderName)
    const relative = path.relative(workspaceRoot, absoluteCwd)
    if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
      return workspace.branch
    }
  }
  return null
}

function runGh(args: Array<string>, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })

    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || 'gh command failed'))
      }
    })
  })
}

export async function createPullRequest(input: CreatePullRequestInput): Promise<CreatePullRequestResult> {
  const { cwd, baseBranchOverride, titleOverride, draft = false, assignSelf = false } = input

  const projectRoot = findProjectRoot(cwd)
  if (!projectRoot) {
    throw new Error('not inside a gitmedaddy project')
  }

  const state = await loadState(projectRoot)
  const branch = resolveCurrentWorkspaceBranch(projectRoot, cwd, state)
  if (!branch) {
    throw new Error('current directory is not inside a displayed workspace')
  }

  const workspace = state.workspaces.find((w) => w.branch === branch)
  if (!workspace) {
    throw new Error(`branch "${branch}" is not currently displayed`)
  }

  const baseBranch = baseBranchOverride ?? state.defaultBaseBranch
  const title = titleOverride ?? workspace.folderName
  const goal = workspace.goal.trim()
  const body = goal ? `## Goal\n${goal}\n` : ''

  const workspacePath = path.join(projectRoot, workspace.folderName)
  await git(['push', '-u', 'origin', branch], { cwd: workspacePath })

  const args = ['pr', 'create', '--base', baseBranch, '--head', branch, '--title', title, '--body', body]
  if (draft) {
    args.push('--draft')
  }
  if (assignSelf) {
    args.push('--assignee', '@me')
  }

  const { stdout } = await runGh(args, workspacePath)
  const url = stdout.trim()
  if (!url) {
    throw new Error('pull request created but URL was not returned')
  }

  return {
    projectRoot,
    branch,
    baseBranch,
    title,
    url
  }
}
