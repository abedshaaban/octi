import { createPullRequest } from '../core/pr'
import type { Command } from 'commander'

export function registerPrCommand(program: Command) {
  program
    .command('pr')
    .option('--base <branch-name>', 'Base branch for the pull request')
    .option('-t, --title <title>', 'Custom pull request title')
    .option('-d, --draft', 'Create pull request as draft')
    .option('-s, --self', 'Assign the pull request to yourself')
    .description('Create a GitHub pull request for the current workspace branch')
    .action(
      async (options: {
        base?: string | undefined
        title?: string | undefined
        draft?: boolean | undefined
        self?: boolean | undefined
      }) => {
        try {
          const result = await createPullRequest({
            cwd: process.cwd(),
            baseBranchOverride: options.base,
            titleOverride: options.title,
            draft: options.draft ?? false,
            assignSelf: options.self === true
          })

          console.log(JSON.stringify(result, null, 2))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error occurred'

          console.error(message)
          process.exitCode = 1
        }
      }
    )
}
