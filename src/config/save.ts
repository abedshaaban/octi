import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig, ProjectState } from "./types";

export async function saveConfig(
  projectRoot: string,
  config: ProjectConfig,
): Promise<void> {
  const configDir = path.join(projectRoot, ".p-008");
  const configPath = path.join(configDir, "config.json");
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function saveState(
  projectRoot: string,
  state: ProjectState,
): Promise<void> {
  const stateDir = path.join(projectRoot, ".p-008");
  const statePath = path.join(stateDir, "state.json");
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

