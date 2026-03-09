import path from "node:path";
import { git, GitCommandError } from "./exec";

export async function initBareRepo(projectRoot: string, repoUrl: string) {
  const gitDir = path.join(projectRoot, ".p-008", "repo.git");

  await git(["clone", "--bare", repoUrl, gitDir], { cwd: projectRoot });

  await git(
    [
      "config",
      "remote.origin.fetch",
      "+refs/heads/*:refs/remotes/origin/*",
    ],
    { gitDir },
  );

  await git(["fetch", "origin"], { gitDir });

  return gitDir;
}

export async function detectDefaultBranch(gitDir: string): Promise<string> {
  // Strategy:
  // 1) Try origin/HEAD symbolic ref (fast path)
  // 2) Fallback to parsing `git remote show origin`
  // 3) Fallback to common names: main, master
  try {
    const { stdout } = await git(
      ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
      { gitDir },
    );
    const fullRef = stdout.trim();
    const parts = fullRef.split("/");
    if (parts.length > 1 && parts[1]) {
      return parts[1];
    }
  } catch {
    // fall through to other strategies
  }

  try {
    const { stdout } = await git(["remote", "show", "origin"], { gitDir });
    const lines = stdout.split("\n");
    for (const line of lines) {
      const match = line.trim().match(/^HEAD branch:\s+(.+)$/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // fall through
  }

  // Try common defaults explicitly
  for (const candidate of ["main", "master"]) {
    try {
      await git(["rev-parse", `refs/remotes/origin/${candidate}`], { gitDir });
      return candidate;
    } catch {
      // keep trying
    }
  }

  throw new Error("remote default branch could not be resolved");
}

export async function fetchLatest(gitDir: string): Promise<void> {
  await git(["fetch", "origin"], { gitDir });
}

export async function ensureBaseBranchExists(
  gitDir: string,
  baseBranch: string,
): Promise<void> {
  try {
    await git(["rev-parse", `refs/remotes/origin/${baseBranch}`], { gitDir });
  } catch {
    throw new Error("base branch not found");
  }
}

export async function ensureLocalBranch(
  gitDir: string,
  branch: string,
  baseBranch: string,
): Promise<void> {
  try {
    await git(["show-ref", "--verify", `refs/heads/${branch}`], { gitDir });
    return;
  } catch {
    // fall through and create branch
  }

  await git(
    ["branch", branch, `refs/remotes/origin/${baseBranch}`],
    { gitDir },
  );
}

export async function createWorktree(
  gitDir: string,
  worktreePath: string,
  branch: string,
): Promise<void> {
  await git(["worktree", "add", worktreePath, branch], { gitDir });
}

