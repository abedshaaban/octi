import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig, ProjectState } from "./types";

export async function loadConfig(projectRoot: string): Promise<ProjectConfig> {
  const configPath = path.join(projectRoot, ".p-008", "config.json");
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as ProjectConfig;
  return parsed;
}

export async function loadState(projectRoot: string): Promise<ProjectState> {
  const statePath = path.join(projectRoot, ".p-008", "state.json");
  const raw = await fs.readFile(statePath, "utf8");
  const parsed = JSON.parse(raw) as ProjectState;
  return parsed;
}

