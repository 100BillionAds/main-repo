---
description: "Use when adding or modifying Next.js API routes, request/response contracts, or auth-guarded server logic."
applyTo: "10badv/src/app/api/**/*.js"
---
# API Instructions

- Always validate required inputs before DB operations.
- Use explicit HTTP status codes and stable JSON shapes.
- Enforce role/session checks with `getServerSession` for protected routes.
- Wrap transactional multi-table writes in DB transactions.
- Keep error messages useful but avoid leaking sensitive internals.

