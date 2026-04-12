---
name: api-from-spec
description: "Generate or refine API route handlers and contracts from written endpoint specs. Use when turning API docs into implementation-ready route code."
---

# API from Spec

## When to Use
- API contract is defined but route implementation is missing.
- Need consistent request/response shape and validation.

## Procedure
1. Read the target spec and identify required auth/validation.
2. Map endpoint to `10badv/src/app/api/**/route.js`.
3. Implement or update handler with explicit error codes.
4. Add or update tests for happy/sad paths.

