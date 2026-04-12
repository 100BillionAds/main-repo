---
description: "Use when touching authentication, authorization, payment, user data handling, and security-sensitive endpoints."
applyTo: "10badv/src/app/api/**/*.js, 10badv/src/lib/**/*.js"
---
# Security Instructions

- Verify role-based access checks on every protected endpoint.
- Validate and sanitize user input server-side.
- Keep payment/point state changes transactional and auditable.
- Do not expose internals or stack traces in API responses.

