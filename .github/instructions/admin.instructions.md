---
description: "Use when implementing admin-only APIs, dashboards, moderation, or privileged operational actions."
applyTo: "10badv/src/app/api/admin/**/*.js, 10badv/src/app/(admin)/**/*.js"
---
# Admin Feature Instructions

- Every admin API must verify session and role before business logic.
- Return explicit 401/403 responses for unauthorized access.
- Log critical admin actions through existing logging patterns.
- Prefer idempotent operations for moderation and status updates.

