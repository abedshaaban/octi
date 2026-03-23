import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig, ProjectState } from "./types";

export async function loadConfig(projectRoot: string): Promise<ProjectConfig> {
  const configPath = path.join(projectRoot, ".gmd", "config.json");
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as ProjectConfig;
  return parsed;
}

export async function loadState(projectRoot: string): Promise<ProjectState> {
  const branchesStatePath = path.join(projectRoot, "state", "branches.json");

  try {
    const raw = await fs.readFile(branchesStatePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ProjectState>;
    return {
      defaultBaseBranch: parsed.defaultBaseBranch ?? "main",
      workspaces: parsed.workspaces ?? [],
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }

  const legacyStatePath = path.join(projectRoot, ".gmd", "state.json");
  const legacyRaw = await fs.readFile(legacyStatePath, "utf8");
  const legacyParsed = JSON.parse(legacyRaw) as Partial<ProjectState>;

  const config = await loadConfig(projectRoot);
  return {
    defaultBaseBranch: legacyParsed.defaultBaseBranch ?? config.defaultBaseBranch,
    workspaces: legacyParsed.workspaces ?? [],
  };
}
