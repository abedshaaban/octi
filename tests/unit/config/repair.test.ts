import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidProjectStateError } from '../../../src/config/errors'
import { listRemoteBranches, resolveGitCommonDir } from '../../../src/git/repo'
import { repairInvalidProjectState } from '../../../src/config/repair'
import { promptInput, promptSelect } from '../../../src/utils/prompt'
import { createTempDir } from '../../helpers/tempDir'

vi.mock('../../../src/git/repo', () => ({
  listRemoteBranches: vi.fn(),
  resolveGitCommonDir: vi.fn()
}))

vi.mock('../../../src/utils/prompt', () => ({
  promptInput: vi.fn(),
  promptSelect: vi.fn()
}))

const tempDirs: Array<string> = []

describe('repairInvalidProjectState', () => {
  beforeEach(() => {
    vi.mocked(listRemoteBranches).mockReset()
    vi.mocked(resolveGitCommonDir).mockReset()
    vi.mocked(promptInput).mockReset()
    vi.mocked(promptSelect).mockReset()
  })

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
  })

  it('repairs an invalid default base branch interactively using remote branches', async () => {
    const projectRoot = await createTempDir('repair-state')
    tempDirs.push(projectRoot)

    await fs.mkdir(path.join(projectRoot, 'state'), { recursive: true })
    await fs.writeFile(
      path.join(projectRoot, 'state', 'branches.json'),
      JSON.stringify({
        defaultBaseBranch: 123,
        settings: { json: false, interactive: false },
        workspaces: [{ branch: 'main', folderName: 'main', goal: '' }]
      }),
      'utf8'
    )
    await fs.mkdir(path.join(projectRoot, 'main', '.git'), { recursive: true })

    vi.mocked(resolveGitCommonDir).mockResolvedValue('/tmp/project/.git')
    vi.mocked(listRemoteBranches).mockResolvedValue(['main', 'develop'])
    vi.mocked(promptSelect).mockResolvedValue('develop')

    const repaired = await repairInvalidProjectState(
      new InvalidProjectStateError(projectRoot, [
        { path: 'defaultBaseBranch', message: 'must be a non-empty string', repairable: true }
      ]),
      true
    )

    expect(repaired).toBe(true)
    const saved = JSON.parse(await fs.readFile(path.join(projectRoot, 'state', 'branches.json'), 'utf8'))
    expect(saved.defaultBaseBranch).toBe('develop')
    expect(promptSelect).toHaveBeenCalledWith(
      'Select default base branch for this project',
      ['main', 'develop'],
      'main'
    )
  })

  it('does not repair non-interactively', async () => {
    const repaired = await repairInvalidProjectState(
      new InvalidProjectStateError('/tmp/project', [
        { path: 'defaultBaseBranch', message: 'must be a non-empty string', repairable: true }
      ]),
      false
    )

    expect(repaired).toBe(false)
  })

  it('falls back to manual input when remote branches cannot be resolved', async () => {
    const projectRoot = await createTempDir('repair-state-manual')
    tempDirs.push(projectRoot)

    await fs.mkdir(path.join(projectRoot, 'state'), { recursive: true })
    await fs.writeFile(
      path.join(projectRoot, 'state', 'branches.json'),
      JSON.stringify({
        defaultBaseBranch: '',
        settings: {},
        workspaces: []
      }),
      'utf8'
    )
    vi.mocked(promptInput).mockResolvedValue('release')

    const repaired = await repairInvalidProjectState(
      new InvalidProjectStateError(projectRoot, [
        { path: 'defaultBaseBranch', message: 'must be a non-empty string', repairable: true }
      ]),
      true
    )

    expect(repaired).toBe(true)
    const saved = JSON.parse(await fs.readFile(path.join(projectRoot, 'state', 'branches.json'), 'utf8'))
    expect(saved.defaultBaseBranch).toBe('release')
  })
})
