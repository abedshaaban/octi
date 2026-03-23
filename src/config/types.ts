export interface ProjectConfig {
  version: 1;
  projectName: string;
  remote: string;
  defaultBaseBranch: string;
}

export interface WorkspaceEntry {
  branch: string;
  folder: string;
  path: string;
  baseBranch: string;
  createdAt: string;
}

export interface ProjectState {
  defaultBaseBranch: string;
  workspaces: WorkspaceEntry[];
}
