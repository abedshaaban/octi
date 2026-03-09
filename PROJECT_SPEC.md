# octi — Workspace-Ready Git Wrapper

## Overview

`octi` is a workspace-first CLI built on top of Git.

Its main goal is to make repository cloning and branch checkout naturally support multiple parallel workspaces from day one.

Instead of the usual Git layout where a repository is cloned into a single folder, `octi` creates a project folder that is already structured for workspaces:

```text
project-name/
  .p-008/
    repo.git/
    config.json
    state.json
  main/
    code/

When a new branch workspace is created, it appears as:

project-name/
  .p-008/
    repo.git/
    config.json
    state.json
  main/
    code/
  feature-auth/
    code/
  fix-login/
    code/

This gives the user direct visibility into all active branches/workspaces and makes switching between them easy.

Product Direction

octi is not a Git replacement.

It is a workspace orchestration layer on top of Git using:

one shared hidden Git repository

multiple linked worktrees

a branch-visible folder structure

The project should be workspace ready immediately after clone.

The top-level mental model is:

one container folder per project

one hidden shared Git repo inside that folder

one visible branch folder per workspace

each branch folder contains a code/ directory

This is optimized for visibility, observability, and easy switching between branches/workspaces.

Phase 1 Goal

Build the first working version of octi with only these core flows:

octi clone <repo-url>

octi checkout <branch-name>

optional -f <base-branch> for checkout

That is the full scope for v1.

Do not build any of the following yet:

AI agent orchestration

provenance or history tracking

semantic merge logic

PR generation

workspace deletion

workspace switching shortcuts

branch merging

remote hosting integrations

dependency optimization

shared node_modules

GUI or TUI

Keep the first version focused and small.

Why This Structure

The project is intended to be workspace-ready by default.

Instead of cloning into:

/project-name

and then later creating worktrees elsewhere, octi should create:

/project-name/<default-branch>/code

right away.

Example:

my-app/
  .p-008/
    repo.git/
    config.json
    state.json
  develop/
    code/

Then when the user runs:

octi checkout feature-auth

it creates:

my-app/
  .p-008/
    repo.git/
    config.json
    state.json
  develop/
    code/
  feature-auth/
    code/

This gives strong branch observability and keeps all workspaces grouped under the project folder.

Important Git Model

Use this Git model:

one hidden shared bare repository in .p-008/repo.git

every visible branch workspace is a Git linked worktree

Important rule

The top-level project-name/ folder is only a container.

It must not itself be a normal checked-out Git worktree.

All real worktrees live under:

/project-name/<branch-folder>/code

The shared Git repository must live under:

/project-name/.p-008/repo.git

This avoids nested-worktree confusion and keeps the structure clean.

Folder Structure

Use this exact structure for v1:

project-name/
  .p-008/
    repo.git/
    config.json
    state.json
  <branch-a>/
    code/
  <branch-b>/
    code/
  <branch-c>/
    code/

Example:

my-app/
  .p-008/
    repo.git/
    config.json
    state.json
  develop/
    code/
  feature-auth/
    code/
  fix-billing/
    code/
Clone Flow
Command
octi clone https://github.com/org/repo.git
Expected behavior

infer the project name from the repo URL

create a new folder named after the project

create a hidden shared Git repo at:

/project-name/.p-008/repo.git

add the remote

fetch remote refs

detect the remote default branch

create the first linked worktree at:

/project-name/<default-branch>/code

create config.json

create state.json

print the created project path and the first workspace path

Example result
my-app/
  .p-008/
    repo.git/
    config.json
    state.json
  develop/
    code/
Checkout Flow
Command
p-008 checkout <new-branch-name>
Expected behavior

find the current p-008 project root

read project config

determine the base branch:

use configured default base branch by default

or override with -f <base-branch>

fetch latest remote state

ensure the base ref exists

create a new branch from that base

create a linked worktree at:

/project-name/<workspace-folder>/code

register the workspace in state.json

print the created path

Example
p-008 checkout feature-auth

Creates:

my-app/
  .p-008/
    repo.git/
    config.json
    state.json
  develop/
    code/
  feature-auth/
    code/
Checkout from a Different Base
Command
p-008 checkout feature-auth -f release-candidate
Expected behavior

use release-candidate as the base branch instead of the configured default

fetch latest remote changes for that branch

create the new branch workspace from that base

register the workspace in state.json

Config File

Store project-level configuration in:

/project-name/.p-008/config.json
Minimum structure
{
  "version": 1,
  "projectName": "my-app",
  "remote": "origin",
  "defaultBaseBranch": "develop"
}

Optional future field:

{
  "workspacePattern": "{branch}/code"
}

For v1, keep config simple.

State File

Store workspace metadata in:

/project-name/.p-008/state.json
Example
{
  "workspaces": [
    {
      "branch": "develop",
      "folder": "develop",
      "path": "develop/code",
      "baseBranch": "develop",
      "createdAt": "2026-03-09T12:00:00Z"
    },
    {
      "branch": "feature/auth",
      "folder": "feature-auth",
      "path": "feature-auth/code",
      "baseBranch": "develop",
      "createdAt": "2026-03-09T12:10:00Z"
    }
  ]
}
Branch Names vs Folder Names

Branch names and folder names should not be treated as identical.

Git branch names may contain slashes or other characters that are not ideal for folder names.

Example:

Git branch: feature/auth

Workspace folder: feature-auth

Requirement

Implement a branch-to-folder slugging strategy.

Rules:

preserve the real Git branch name internally

create a safe folder slug for filesystem use

avoid collisions

if collision happens, append a short suffix

Examples

feature/auth -> feature-auth

fix/login-loop -> fix-login-loop

release/v1.2 -> release-v1-2

Store the mapping in state.json.

Project Root Discovery

octi checkout must work from anywhere inside a workspace.

The CLI should walk upward from the current working directory until it finds:

.p-008/config.json

That location is the project root.

This allows commands to be run from inside:

/project-name/develop/code
/project-name/feature-auth/code/src
/project-name/fix-login/code/tests

and still resolve the correct p-008 project.

Node Modules and Dependencies

Do not attempt to share one live node_modules directory across workspaces.

Each /code workspace is allowed to have its own dependencies.

That means this is valid and expected:

my-app/
  develop/
    code/
    node_modules/
  feature-auth/
    code/
    node_modules/
For v1

do not build any custom dependency sharing logic

do not symlink node_modules

do not try to reuse build artifacts automatically

do not optimize Node package installation yet

Later, disk usage can be improved by recommending tools like pnpm, but that is explicitly out of scope for the first version.

Suggested Tech Stack

Use:

TypeScript

Node.js

a CLI framework such as Commander

native filesystem APIs

child process execution for Git commands

The project should be structured like a normal CLI application.

Suggested directories
src/
  cli/
  commands/
  core/
  git/
  config/
  utils/
Suggested modules

commands/clone.ts

commands/checkout.ts

core/project.ts

core/workspace.ts

git/exec.ts

git/repo.ts

config/load.ts

config/save.ts

utils/slug.ts

utils/findProjectRoot.ts

Technical Requirements
octi clone <repo-url> must:

validate the repo URL

infer the project name

fail clearly if the target folder already exists and is not empty

initialize the hidden bare repo

configure the remote

fetch remote refs

detect the remote default branch

create the first workspace from that default branch

write config.json

write state.json

octi checkout <branch-name> must:

work only inside an existing p-008 project

find the project root automatically

read config and state

fetch latest remote state before branching

use configured default base branch unless -f is provided

create the new branch and linked worktree

update state.json

fail clearly if the workspace folder already exists

fail clearly if the branch already exists in a conflicting way

-f <base-branch> must:

override the default base branch

verify the base exists locally or remotely

use that base to create the new workspace

Error Handling Requirements

Errors must be explicit and readable.

Examples:

not inside a p-008 project

target project folder already exists

target folder is not empty

invalid repo URL

remote default branch could not be resolved

base branch not found

workspace folder already exists

slug collision could not be resolved

Git command failed

Avoid silent failure.

Acceptance Criteria

The implementation is successful when all of these work.

Scenario 1 — clone
octi clone https://github.com/org/my-app.git

Creates:

my-app/
  .p-008/
    repo.git/
    config.json
    state.json
  <default-branch>/
    code/

And the code/ folder is a valid linked worktree.

Scenario 2 — checkout from default base

Inside the project:

octi checkout feature-auth

Creates:

my-app/
  feature-auth/
    code/

And the new branch is based on the configured default base branch.

Scenario 3 — checkout from custom base
octi checkout hotfix-login -f release

Creates:

my-app/
  hotfix-login/
    code/

And the new branch is based on release.

Scenario 4 — state persistence

After multiple checkouts, state.json correctly lists all workspaces and their mappings.

Scenario 5 — path discovery

Running octi checkout ... from anywhere inside one of the /code folders still finds the project root correctly.

Implementation Plan
Step 1

Set up the CLI project structure.

Step 2

Implement config/state read and write utilities.

Step 3

Implement project root discovery.

Step 4

Implement Git command execution wrappers.

Step 5

Implement p-008 clone.

Step 6

Implement p-008 checkout.

Step 7

Implement branch-folder slugging.

Step 8

Test against a real GitHub repository.

Step 9

Add basic integration tests for clone and checkout flows.

Notes for the AI Agent

Important constraints:

keep v1 minimal

do not redesign the folder structure

do not move the shared repo outside the project folder

do not make the top-level project folder a checked-out Git worktree

do not add features beyond clone and checkout unless required for those flows

prefer simple and inspectable JSON files

make the filesystem layout easy to inspect manually

The main outcome should be a clean, working CLI that proves this workspace-first model.

Deliverable

Build the first working version of octi with:

octi clone <repo-url>

octi checkout <branch-name>

optional -f <base-branch>

the exact folder structure described above

That is the full target for the first implementation.
```
