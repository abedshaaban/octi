import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadState } from '../../../src/config/load'
import { resolveCliBehavior } from '../../../src/cli/behavior'
import { findProjectRoot } from '../../../src/utils/findProjectRoot'
import { setWritableValue } from '../../helpers/tty'

vi.mock('../../../src/config/load', () => ({
  loadState: vi.fn()
}))

vi.mock('../../../src/utils/findProjectRoot', () => ({
  findProjectRoot: vi.fn()
}))

describe('resolveCliBehavior', () => {
  let restoreStdin: (() => void) | undefined
  let restoreStdout: (() => void) | undefined

  afterEach(() => {
    restoreStdin?.()
    restoreStdout?.()
    restoreStdin = undefined
    restoreStdout = undefined
  })

  it('uses saved project settings when inside a project', async () => {
    vi.mocked(findProjectRoot).mockReturnValue('/tmp/project')
    vi.mocked(loadState).mockResolvedValue({
      defaultBaseBranch: 'main',
      settings: { json: false, interactive: true },
      workspaces: []
    })
    restoreStdin = setWritableValue(process.stdin, 'isTTY', true)
    restoreStdout = setWritableValue(process.stdout, 'isTTY', true)

    await expect(resolveCliBehavior('/tmp/project/app')).resolves.toEqual({
      json: false,
      interactive: true
    })
  })

  it('disables interactive mode when no tty is available', async () => {
    vi.mocked(findProjectRoot).mockReturnValue('/tmp/project')
    vi.mocked(loadState).mockResolvedValue({
      defaultBaseBranch: 'main',
      settings: { json: true, interactive: true },
      workspaces: []
    })
    restoreStdin = setWritableValue(process.stdin, 'isTTY', false)
    restoreStdout = setWritableValue(process.stdout, 'isTTY', false)

    await expect(resolveCliBehavior('/tmp/project/app')).resolves.toEqual({
      json: true,
      interactive: false
    })
  })

  it('prefers explicit overrides over saved settings', async () => {
    vi.mocked(findProjectRoot).mockReturnValue('/tmp/project')
    vi.mocked(loadState).mockResolvedValue({
      defaultBaseBranch: 'main',
      settings: { json: true, interactive: false },
      workspaces: []
    })
    restoreStdin = setWritableValue(process.stdin, 'isTTY', true)
    restoreStdout = setWritableValue(process.stdout, 'isTTY', true)

    await expect(resolveCliBehavior('/tmp/project/app', { json: false, interactive: true })).resolves.toEqual({
      json: false,
      interactive: true
    })
  })

  it('falls back to default settings outside a project', async () => {
    vi.mocked(findProjectRoot).mockReturnValue(null)
    restoreStdin = setWritableValue(process.stdin, 'isTTY', true)
    restoreStdout = setWritableValue(process.stdout, 'isTTY', true)

    await expect(resolveCliBehavior('/tmp/elsewhere')).resolves.toEqual({
      json: true,
      interactive: true
    })
  })
})
