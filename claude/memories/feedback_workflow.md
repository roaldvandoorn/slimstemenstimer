---
name: Working method preferences
description: How the user wants Claude Code to approach tasks in this project
type: feedback
---

Present plan and wait for developer approval before executing any code changes. Each step should be individually executable and end with a check-in.

**Why:** Explicitly stated in the original project instructions and reinforced in CLAUDE.md. The user wants control over each step of execution.

**How to apply:** After proposing a plan or code change, stop and wait. Do not batch multiple steps without separate approval. After each step completes, update `claude/PROGRESS.md` and check in with the user before the next step.

Save knowledge and progress in `claude/` subfolder after every step — `claude/PLAN.md` and `claude/PROGRESS.md` are the living documents for this project.
