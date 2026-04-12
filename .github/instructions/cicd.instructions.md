---
description: "Use when creating or updating CI/CD workflows, release gates, branch policies, and deployment automation."
applyTo: ".github/workflows/**/*.yml"
---
# CI/CD Instructions

- CI must fail on lint/test/build failures.
- Keep workflow steps aligned with real package scripts.
- Cache dependencies when safe, but do not hide failures.
- Protect merge path with required checks and clear status names.

