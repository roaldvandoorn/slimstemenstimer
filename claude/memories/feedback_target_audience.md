---
name: Target audience and feature scope
description: The app targets board game users, not developers — exclude dev/ops features that add no end-user value
type: feedback
---

Deprioritise or skip improvements that only benefit developers or DevOps engineers. The product is a companion app for the "De Slimste Mens" board game, aimed at ordinary users hosting a game night.

**Why:** Items #16 (Docker image) and #14 (CD auto-deploy to VPS) were explicitly ruled out. Docker containers add no value for a board game audience; neither does SSH-based VPS deployment. The user wants easy install, no-knowledge setup, and usability improvements — not infrastructure tooling.

**How to apply:** When suggesting next steps from `improvements.md`, skip #14 and #16 entirely. Prioritise features that reduce friction for non-technical users: easy install, in-game quality-of-life (sound, presets, themes), and features that make game nights more fun.
