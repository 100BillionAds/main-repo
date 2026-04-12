---
name: deploy
description: "Prepare deployment-ready configuration and release checklist for 10badv. Use for CI/CD setup, environment wiring, and launch validation."
---

# Deploy

## When to Use
- Preparing staging/production deployment.
- Defining release gates and rollback checks.

## Procedure
1. Verify lint/test/build gates are passing.
2. Confirm environment variables and secrets map.
3. Apply deployment steps for chosen platform.
4. Run post-deploy smoke checks.

