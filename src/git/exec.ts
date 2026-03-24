import { spawn } from 'node:child_process'

export interface GitExecOptions {
  cwd?: string
  gitDir?: string
  /** Stream stdout/stderr to the process (live progress, verbose clone output). */
  inheritStdio?: boolean
}

export interface GitExecResult {
  stdout: string
  stderr: string
}

export class GitCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string[],
    public readonly code: number | null,
    public readonly stderr: string
  ) {
    super(message)
  }
}

export function git(args: string[], options: GitExecOptions = {}): Promise<GitExecResult> {
  const fullArgs = [...(options.gitDir ? ['--git-dir', options.gitDir] : []), ...args]
  const inherit = options.inheritStdio === true

  return new Promise<GitExecResult>((resolve, reject) => {
    const child = spawn('git', fullArgs, {
      cwd: options.cwd,
      stdio: inherit ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    if (!inherit) {
      child.stdout!.setEncoding('utf8')
      child.stderr!.setEncoding('utf8')

      child.stdout!.on('data', (chunk: string) => {
        stdout += chunk
      })
      child.stderr!.on('data', (chunk: string) => {
        stderr += chunk
      })
    }

    child.on('error', (err) => {
      reject(err)
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new GitCommandError('Git command failed', fullArgs, code, stderr || stdout))
      }
    })
  })
}
