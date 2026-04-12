# 100BillionAds Workspace Instructions

## Delivery Workflow
- Always work on a feature branch and merge only after all quality gates pass.
- Treat this repository as a monorepo: app code is under `10badv/`, docs under `docs/`.
- Do not bypass failed checks; fix root causes before marking work complete.

## Quality Gates (required before merge)
- `cd 10badv && npm run lint`
- `cd 10badv && npm run test:unit`
- `cd 10badv && npm run test:integration`
- `cd 10badv && npm run build`

## Backend/Data Guardrails
- Never hardcode secrets; use environment variables only.
- Keep DB schema changes backward-compatible and reversible.
- For launch phase, prefer low-cost DB paths first (local MySQL for dev/test, managed low-cost MySQL for production).

## Testing Expectations
- Cover real user behavior in tests, not implementation details.
- Critical commerce flow (request -> proposal -> transaction) must remain protected by integration tests.
