import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCliBehavior, resolveFallbackCliBehavior } from '../../../src/cli/behavior'
import { getGlobalCliOptions } from '../../../src/cli/options'
import { printError, printResult } from '../../../src/cli/output'
import { executeCommand } from '../../../src/commands/_shared'
import { InvalidProjectStateError } from '../../../src/config/errors'
import { repairInvalidProjectState } from '../../../src/config/repair'

vi.mock('../../../src/cli/behavior', () => ({
  resolveCliBehavior: vi.fn(),
  resolveFallbackCliBehavior: vi.fn()
}))

vi.mock('../../../src/cli/options', () => ({
  getGlobalCliOptions: vi.fn()
}))

vi.mock('../../../src/cli/output', () => ({
  printError: vi.fn(),
  printResult: vi.fn()
}))

vi.mock('../../../src/config/repair', () => ({
  repairInvalidProjectState: vi.fn()
}))

describe('executeCommand', () => {
  beforeEach(() => {
    vi.mocked(resolveCliBehavior).mockReset()
    vi.mocked(resolveFallbackCliBehavior).mockReset()
    vi.mocked(getGlobalCliOptions).mockReset()
    vi.mocked(printError).mockReset()
    vi.mocked(printResult).mockReset()
    vi.mocked(repairInvalidProjectState).mockReset()
    process.exitCode = undefined

    vi.mocked(getGlobalCliOptions).mockReturnValue({})
    vi.mocked(resolveFallbackCliBehavior).mockReturnValue({ json: true, interactive: true })
  })

  it('repairs invalid project state and retries the command once', async () => {
    const invalidState = new InvalidProjectStateError('/tmp/project', [
      { path: 'defaultBaseBranch', message: 'must be a non-empty string', repairable: true }
    ])
    const run = vi.fn().mockResolvedValue('done')

    vi.mocked(resolveCliBehavior)
      .mockRejectedValueOnce(invalidState)
      .mockResolvedValueOnce({ json: true, interactive: true })
    vi.mocked(repairInvalidProjectState).mockResolvedValue(true)

    await executeCommand({} as never, run)

    expect(repairInvalidProjectState).toHaveBeenCalledWith(invalidState, true)
    expect(run).toHaveBeenCalledTimes(1)
    expect(printResult).toHaveBeenCalledWith('done', { json: true, interactive: true })
    expect(printError).not.toHaveBeenCalled()
  })

  it('prints the invalid state error when repair is not available', async () => {
    const invalidState = new InvalidProjectStateError('/tmp/project', [
      { path: 'defaultBaseBranch', message: 'must be a non-empty string', repairable: true }
    ])

    vi.mocked(resolveCliBehavior).mockRejectedValueOnce(invalidState)
    vi.mocked(repairInvalidProjectState).mockResolvedValue(false)

    await executeCommand({} as never, vi.fn())

    expect(printError).toHaveBeenCalledWith(invalidState, { json: true, interactive: true })
    expect(process.exitCode).toBe(1)
  })
})
