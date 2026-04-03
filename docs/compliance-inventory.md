# Compliance Inventory (Current vs Required)

## Scope

This inventory maps current outbound voice/SMS and workflow surfaces to required
TCPA/state safeguards and ownership modules.

## Existing Surfaces

- Retell web-call creation: `src/app/api/voice/retell/web-call/route.ts`
- Retell webhook ingestion: `src/app/api/webhooks/retell/route.ts`
- SMS webhook ingestion: `src/app/api/webhooks/sms/route.ts`
- Workflow execution (sms/voice/email nodes): `src/services/workflowCompilerService.ts`
- User-initiated outbound inbox replies: `src/app/api/inbox/reply/route.ts`
- Activity logs: `convex/callLogs.ts`, `convex/smsLogs.ts`

## Gap Map

| Safeguard | Current State | Owner Module(s) |
| --- | --- | --- |
| National/state/internal DNC suppression | Missing hard preflight block | `convex/compliance.ts`, `src/services/compliance/policyEngine.ts` |
| Consent evidence and revocation | Missing evidence model + checks | `convex/schema.ts`, `convex/compliance.ts`, dashboard legal/compliance UX |
| Calling window enforcement (recipient timezone) | Missing | `src/services/compliance/policyEngine.ts`, workflow + API call sites |
| AI voice disclosure at start | Missing non-bypass injection | `src/constants/complianceDisclosures.ts`, workflow + call APIs |
| SMS/voice opt-out processing | Missing immediate suppression update | `src/app/api/webhooks/sms/route.ts`, `convex/compliance.ts` |
| Caller ID validation policy | Missing | `src/services/compliance/policyEngine.ts`, call route/workflow preflight |
| State rule matrix | Missing | `src/constants/compliancePolicies.ts`, `convex/compliance.ts` |
| Legal acceptance gating | Missing | legal pages + `OnboardUser`/dashboard gate + API checks |
| Violation monitoring + enforcement | Missing | `convex/compliance.ts`, compliance dashboard/API |

## Enforcement Points (Must Be Fail-Closed)

- Workflow node execution before provider calls (`sms`, `voice_call`, nurture `email`)
- Retell web-call API entrypoint
- Outbound inbox reply API path for SMS providers

## Evidence and Audit Targets

- Log compliance decision snapshots on each outbound attempt.
- Persist policy version, reason codes, and decision (allow/block).
- Keep legal acceptance and opt-out events queryable for defense exports.
