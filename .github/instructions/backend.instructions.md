---
description: "Use when working in backend modules including db utilities, server setup, transaction handling, and domain services."
applyTo: "10badv/src/lib/**/*.js, 10badv/server.js"
---
# Backend Instructions

- Keep data consistency and transaction safety as first priority.
- Prefer shared helpers/utilities over duplicated query logic.
- Make failure modes explicit; avoid broad catch-and-ignore behavior.
- Keep performance in mind for listing endpoints (indexes, limits, pagination).

