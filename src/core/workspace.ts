import fs from "node:fs/promises";
import path from "node:path";
import { findProjectRoot } from "../utils/findProjectRoot";
import { loadConfig, loadState } from "../config/load";
import { saveState } from "../config/save";
import type { ProjectState } from "../config/types";
import { branchToFolderSlug, resolveSlugCollision } from "../utils/slug";
import { fetchLatest, ensureBaseBranchExists, ensureLocalBranch, createWorktree } from "../git/repo";

export interface CheckoutWorkspaceInput {
  branchName: string;
  baseBranchOverride?: string | undefined;
  cwd: string;
}

export interface CheckoutWorkspaceResult {
  projectRoot: string;
  workspacePath: string;
  branch: string;
  baseBranch: string;
}

export async function checkoutWorkspace(
  input: CheckoutWorkspaceInput,
): Promise<CheckoutWorkspaceResult> {
  const { branchName, baseBranchOverride, cwd } = input;

  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) {
    throw new Error("not inside a p-008 project");
  }

  const config = await loadConfig(projectRoot);
  const state = await loadState(projectRoot);

  const baseBranch = baseBranchOverride ?? config.defaultBaseBranch;

  const gitDir = path.join(projectRoot, ".p-008", "repo.git");

  await fetchLatest(gitDir);
  await ensureBaseBranchExists(gitDir, baseBranch);

  const desiredSlug = branchToFolderSlug(branchName);
  const existingSlugs = new Set(state.workspaces.map((w) => w.folder));
  const folderSlug = resolveSlugCollision(desiredSlug, existingSlugs);

  if (existingSlugs.has(folderSlug)) {
    throw new Error("workspace folder already exists");
  }

  const existingBranch = state.workspaces.find(
    (w) => w.branch === branchName,
  );
  if (existingBranch) {
    throw new Error("branch already exists in a conflicting way");
  }

  const workspaceDir = path.join(projectRoot, folderSlug);
  const codeDir = path.join(workspaceDir, "code");

  try {
    await fs.mkdir(codeDir, { recursive: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("workspace folder already exists");
    }
    throw error;
  }

  await ensureLocalBranch(gitDir, branchName, baseBranch);
  await createWorktree(gitDir, codeDir, branchName);

  const newEntry = {
    branch: branchName,
    folder: folderSlug,
    path: path.join(folderSlug, "code"),
    baseBranch,
    createdAt: new Date().toISOString(),
  };

  const newState: ProjectState = {
    workspaces: [...state.workspaces, newEntry],
  };

  await saveState(projectRoot, newState);

  return {
    projectRoot,
    workspacePath: codeDir,
    branch: branchName,
    baseBranch,
  };
}

