#!/usr/bin/env node

import { Command } from "commander";
import { registerCloneCommand } from "../commands/clone";
import { registerCheckoutCommand } from "../commands/checkout";

export function createCli() {
  const program = new Command();

  program
    .name("p-008")
    .description("Workspace-first Git wrapper")
    .version("1.0.0");

  registerCloneCommand(program);
  registerCheckoutCommand(program);

  return program;
}

if (require.main === module) {
  const program = createCli();
  program.parse(process.argv);
}

