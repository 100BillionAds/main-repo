---
name: docker-manage
description: "Manage local Docker-based runtime for app and database dependencies. Use for reproducible local/dev CI setup."
---

# Docker Manage

## When to Use
- Standardizing local app+DB startup.
- Running integration tests in containerized environment.

## Procedure
1. Define required services in `docker-compose.yml`.
2. Keep health checks and env wiring explicit.
3. Start/verify services and run smoke checks.
4. Keep data volumes strategy clear for dev/test.

