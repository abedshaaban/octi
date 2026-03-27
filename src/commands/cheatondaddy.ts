import { cheatOnDaddy } from '../core/cheatondaddy'
import { executeCommand } from './_shared'
import type { Command } from 'commander'

export function registerCheatOnDaddyCommand(program: Command) {
  program
    .command('cheatondaddy')
    .description('Undo gmd workspace layout and restore a normal git repository')
    .action(async (_options: object, command: Command) => {
      await executeCommand(command, async () => {
        return cheatOnDaddy({ cwd: process.cwd() })
      })
    })
}
