import type { Command } from "commander";
import { checkoutWorkspace } from "../core/workspace";

export function registerCheckoutCommand(program: Command) {
  program
    .command("new")
    .alias("n")
    .argument("<branch-name>", "Name of the new workspace branch")
    .option("-f, --from <base-branch>", "Base branch to create the workspace from")
    .description("Create a new workspace for a branch")
    .action(async (branchName: string, options: { from?: string | undefined }) => {
      try {
        const result = await checkoutWorkspace({
          branchName,
          baseBranchOverride: options.from,
          cwd: process.cwd(),
        });

        if (result.usedExistingRemoteBranch) {
          // eslint-disable-next-line no-console
          console.warn(
            `\x1b[33mWarning: branch "${branchName}" already exists on origin; ` +
              "it cannot be created again, so it was added locally.\x1b[0m",
          );
        }

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        // eslint-disable-next-line no-console
        console.error(message);
        process.exitCode = 1;
      }
    });
}
