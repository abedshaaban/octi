import { Command } from 'commander'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerCheatOnDaddyCommand } from '../../../src/commands/cheatondaddy'
import { cheatOnDaddy } from '../../../src/core/cheatondaddy'

vi.mock('../../../src/core/cheatondaddy', () => ({
  cheatOnDaddy: vi.fn()
}))

describe('cheatondaddy command', () => {
  beforeEach(() => {
    vi.mocked(cheatOnDaddy).mockReset()
    process.exitCode = undefined
  })

  it('prints the JSON result to stdout on success', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(cheatOnDaddy).mockResolvedValue({ restored: true })
    const program = new Command()
    registerCheatOnDaddyCommand(program)

    await program.parseAsync(['node', 'test', 'cheatondaddy'])

    expect(cheatOnDaddy).toHaveBeenCalledWith({ cwd: process.cwd() })
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ restored: true }, null, 2))
    expect(errorSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('prints the error message and sets exitCode on failure', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(cheatOnDaddy).mockRejectedValue(new Error('restore failed'))
    const program = new Command()
    registerCheatOnDaddyCommand(program)

    await program.parseAsync(['node', 'test', 'cheatondaddy'])

    expect(errorSpy).toHaveBeenCalledWith('restore failed')
    expect(logSpy).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)

    logSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
