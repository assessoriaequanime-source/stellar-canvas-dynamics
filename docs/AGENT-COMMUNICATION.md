# Agent Communication Protocol — SingulAI AvatarPro Vault

This document is the single source of truth for communication between GPT, Codex and Copilot/VS Code during the SingulAI AvatarPro Vault hackathon work.

## Agents and responsibilities

### GPT — Coordinator and approver

GPT is responsible for:

- defining the execution order;
- approving scope and architecture;
- protecting the VPS and production environments;
- defining task documents;
- reviewing agent reports;
- deciding the next action.

GPT does not deploy directly to the VPS unless explicitly requested and only after the approved checklist.

### Codex — Technical executor

Codex is responsible for:

- implementing scoped code changes;
- generating or editing files requested by GPT;
- running build and local validation;
- reporting exact results;
- not changing scope without approval.

Codex must not touch the VPS, `singulai.site`, other clients or unrelated services.

### Copilot / VS Code — Workspace and Git operator

Copilot/VS Code is responsible for:

- applying changes inside the physical workspace;
- validating files in the local repository;
- handling authenticated Git operations;
- publishing branches;
- opening pull requests;
- helping with visual/local checks.

Copilot/VS Code must not deploy to the VPS unless GPT provides a specific VPS deployment task.

## Repository context

- Repository: `assessoriaequanime-source/stellar-canvas-dynamics`
- Base branch: `main`
- Active branch: `hackathon/audit-readonly-brand-cleanup`
- Active MVP: `SingulAI AvatarPro Vault`
- Active demo routes: `/vault` and `/audit`

## VPS protection rule

The VPS is frozen until the branch is published, reviewed and preferably merged.

Future VPS changes are allowed only for:

- domain: `singulai.live`
- directory: `/projects/active/stellar-canvas-dynamics`
- PM2 process: `singulai-live-dashboard`

Forbidden:

- `singulai.site`
- other Nginx domains
- other PM2 services
- other clients
- other directories in `/var/www` or `/projects`

## Standard handoff format

Every agent must start and finish with this format:

```txt
AGENT:
ENV:
REPO:
BRANCH:
COMMIT:
STATUS:
BUILD:
ROUTES:
GIT DIFF:
PUSH:
PR:
BLOCKERS:
NEXT ACTION:
```

## Standard local validation commands

```bash
pwd
git status
git branch --show-current
git log --oneline -5
git diff --stat origin/main..HEAD
npm run build
```

Preview validation:

```bash
npm run preview -- --host 0.0.0.0 --port 4174
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4174/vault
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4174/audit
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4174/dashboard
```

Expected result:

```txt
200
200
200
```

## Task document workflow

All execution tasks must be created under:

```txt
docs/agent-tasks/
```

Each task file must include:

- task ID;
- owner agent;
- environment;
- objective;
- scope;
- forbidden actions;
- commands;
- expected output;
- result section to be filled by the executor;
- approval section to be filled by GPT.

## Rule for task execution

1. GPT creates or updates the task file.
2. Codex or Copilot executes only what is inside the task file.
3. The executor updates the `Execution Report` section.
4. GPT reviews the report and defines the next task.

## Current priority

Publish a real diff for `hackathon/audit-readonly-brand-cleanup` containing:

- `/vault` operational MVP;
- `/audit` read-only panel;
- SGL execution credit flow;
- Solana mock adapter;
- README and `HACKATHON_SCOPE.md`;
- copy buttons and proof badges;
- SOL/SGL compliance messaging;
- Ethereum/Sepolia marked as legacy.
