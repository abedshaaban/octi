import type { Command } from 'commander'
import { createPullRequest } from '../core/pr'

export function registerPrCommand(program: Command) {
  program
    .command('pr')
    .option('--base <branch-name>', 'Base branch for the pull request')
    .option('--title <title>', 'Custom pull request title')
    .option('--draft', 'Create pull request as draft')
    .description('Create a GitHub pull request for the current workspace branch')
    .action(
      async (options: { base?: string | undefined; title?: string | undefined; draft?: boolean | undefined }) => {
        try {
          const result = await createPullRequest({
            cwd: process.cwd(),
            baseBranchOverride: options.base,
            titleOverride: options.title,
            draft: options.draft ?? false
          })
          // eslint-disable-next-line no-console
          console.log(JSON.stringify(result, null, 2))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error occurred'
          // eslint-disable-next-line no-console
          console.error(message)
          process.exitCode = 1
        }
      }
    )
}
