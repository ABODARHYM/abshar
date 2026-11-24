# ABSHER BI — Single Work Ledger and No-Repeat Protocol

This document is the canonical record for ongoing engineering work. Update this file before starting a task and immediately after completing or blocking it. Do not create parallel audit plans or repeat completed work in chat notes.

## 1. Non-negotiable operating rules

1. **One task, one ID.** Every finding, fix, test, deployment check, and operational action must have a stable ID (for example `PRICING-ROUTING-001`). A task without an ID is not started.
2. **Read before doing.** At the start of every session, read this ledger, inspect the current branch/commit and open PRs, then inspect the latest CI run and relevant deployment state. Do not ask the user to repeat information already recorded here.
3. **Evidence beats recollection.** A task is complete only when its evidence is recorded: commit SHA, file/path or endpoint, test/workflow run URL, result, and date. A previous chat statement alone is not completion evidence.
4. **No duplicate execution.** If the same task is `DONE` and its input fingerprint has not changed, reuse its evidence. Do not rerun the same audit, patch, migration, manual test, or report generation.
5. **Change-triggered revalidation only.** Reopen a completed task only if one of its declared inputs/dependencies changed, its evidence expired, a new defect appeared, or the user explicitly asks for a fresh check. Record the trigger before rerunning.
6. **Separate implementation from verification.** Do not repeatedly re-review unchanged files. Review only the changed diff and impacted dependencies, then run the smallest relevant tests. Run the full suite only for a release gate, broad/shared change, or explicit request.
7. **One canonical fix.** Before editing, search for an existing implementation, prior patch, open PR, or migration that already addresses the finding. Extend the existing fix instead of creating a second fix.
8. **No duplicate migrations or data writes.** Check the migration ledger and backup evidence first. Never re-run applied migrations or repeat a write operation as a test. Production, database writes, migrations, secrets, and deployment changes require explicit authorization.
9. **One consolidated report.** Keep a single current report per workstream. Append dated evidence; do not generate another near-identical report unless inputs materially changed.
10. **No false completion.** Mark a task `BLOCKED` when evidence is unavailable. Do not describe code on an un-deployed branch as live or tested in Staging/Production.

## 2. Task state machine

Use only these states:

- `NOT_STARTED` — no work performed.
- `IN_PROGRESS` — active work with a defined scope.
- `DONE` — acceptance criteria met and evidence recorded.
- `BLOCKED` — cannot proceed; blocker and required action recorded.
- `REOPENED` — a completed task has a documented change-trigger requiring revalidation.

Allowed transitions:
`NOT_STARTED -> IN_PROGRESS -> DONE`
or `IN_PROGRESS -> BLOCKED -> IN_PROGRESS`.
A `DONE` item may become `REOPENED` only with a written trigger and changed input fingerprint.

## 3. Required task record

For every task, record:

| Field | Required value |
|---|---|
| ID | Stable unique identifier |
| Scope | Exact files, feature, endpoint, or environment |
| State | One state from the state machine |
| Input fingerprint | Relevant base/head commit SHA, file hashes, schema/migration version, config version, or deployment ID |
| Acceptance criteria | Observable pass conditions |
| Evidence | Commit SHA, test/run URL, command/report, endpoint response, or migration ledger result |
| Last checked | UTC date/time |
| Reopen trigger | Exact condition that justifies repeating the work |
| Next action | One action, or `NONE` |

Do not mark a broad category such as "finance audited" as done without listing its concrete checks and evidence.

## 4. Verification reuse policy

- **Same commit + same environment + same configuration:** reuse passing CI and deployment evidence; no duplicate manual run.
- **New code commit:** run required CI for the changed code. Do not rerun unrelated manual audits.
- **Changed dependency or shared contract:** rerun only the affected package tests plus the integration boundary.
- **Changed database schema/migration:** inspect migration ledger and backup first; run disposable-database migration CI. Live database action remains separately gated.
- **Changed Render branch/deploy/config:** re-check deployment identity and health once; do not redeploy merely to repeat a health check.
- **New live routing provider configuration:** check the sanitized readiness endpoint and make one controlled route-quote test with approved test coordinates. Do not expose secrets or log coordinates.
- **No changed input:** do not rerun. State: "previous evidence remains valid for the recorded commit/environment."

## 5. PR and branch discipline

- Keep the existing stacked PR chain intact unless explicitly approved to retarget it.
- Before creating a PR or branch, search open PRs and branches for the same scope.
- Add follow-up commits to the existing relevant branch/PR; do not open another PR for the same fix.
- Never merge a PR, enable auto-deploy, change a Render branch, or deploy without explicit user authorization.
- Do not treat CI on a PR branch as proof of Staging or Production behavior.
- Every deployment record must include service, branch, commit SHA, deploy ID, environment, and health result.

## 6. Current verified work ledger

The records below are the known baseline at the time this protocol was added. If live GitHub/Render state differs, verify the changed field once and update this section; do not repeat the underlying work.

| ID | Scope | State | Evidence / current status | Reopen trigger |
|---|---|---|---|---|
| GEO-PR31-001 | Save verified delivery-zone coverage polygon | DONE | User confirmed polygon saved and approved; PR #31 fix for SQL parameter typing passed CI | New polygon save defect or relevant code change |
| PRICE-PR32-001 | Distance-tier raw-boundary selection and snapshot rounding | DONE | Included in PR #32 head `2d912bd884cc881db15c788d48e00b5c46b4349e`; regression test included in CI run #530 | Pricing calculation code or tier boundary contract changes |
| PRICE-PR32-002 | List inactive tiers and admin reactivation/edit/deactivation handling | DONE | Included in PR #32 head above; CI run #530 passed | Admin pricing UI/API contract changes |
| ROUTE-PR32-001 | HeiGIT ORS server-side route integration and sanitized errors | DONE (code/CI only) | PR #32; CI run #530 passed; 162 backend tests across 24 suites; no live route-quote validation yet | Provider readiness check or controlled route quote fails |
| CI-STACK-001 | CI matrix for stacked PRs #28–#32 | DONE | Latest heads verified: PR #28 run #45099616394; #29 run #45099925871; #30 run #45100002019; #31 run #45100047627; #32 code head `0fc9846498e4983d9ed2aba83cddfb45514d11e3` run #45293489276. All six jobs succeeded on each run: backend tests/typecheck/build, four frontend production builds, and disposable PostgreSQL migration chain. Subsequent PR32 head `ad22535d3efd190d44b9f610f16c554e8c6ca84f` changed only this ledger; no code tests repeated. Evidence: https://github.com/ABODARHYM/abshar/actions/runs/45293489276 | New code commit on a relevant PR head or workflow change |
| STAGE-PR32-001 | Deploy PR32 to Backend Staging and verify ORS | BLOCKED (deploy succeeded; ORS live verification pending) | 2026-11-24 UTC: Render service `srv-dbt4dqbbc2fs73d39s3g`, branch `fix/require-complete-distance-bands-20261123`, AutoDeploy=no/off. Deploy `dep-dc2dd8p7lnhs73e4jq3g` is `live`, commit `ad22535d3efd190d44b9f610f16c554e8c6ca84f`; build and deploy events succeeded. Runtime logs confirm Nest started on port 10000 in staging and mounted `GET /api/v1/pricing/routing/status`. No startup error observed in inspected logs. Root path GET/HEAD returned expected 404 because no root route is configured. The sanitized routing status endpoint and controlled ORS route quote have NOT been called; authenticated access/test coordinates are required. No DB migration or write was run. | Authenticated readiness endpoint result and one controlled route quote using approved test coordinates |
| PRICE-FEES-001 | Approve actual delivery-fee amounts and currency | BLOCKED | Distance tiers are defined, but exact amounts/currency are not approved; no guessed defaults | User/admin provides approved amounts and currency |
| PR-MERGE-001 | Merge stacked PRs | BLOCKED | PRs #28–#32 remain open/unmerged; no merge authorization | Explicit user instruction to merge a specified PR |

## 7. Session start checklist

1. Read this file.
2. Read current PR head/base SHAs and changed-file list.
3. Read the latest relevant CI result; reuse it if the tested SHA matches.
4. Read the current Render service branch, live commit, deploy ID, and AutoDeploy setting.
5. Compare those facts with this ledger and update only changed facts.
6. Select the single next task with the highest dependency priority.
7. Do not repeat a completed task unless its reopen trigger is met.

## 8. Session close checklist

1. Update the existing task row; do not create a duplicate row.
2. Record exact commit SHA and evidence link.
3. Mark unresolved work `BLOCKED` with one concrete blocker.
4. Record the next single action.
5. Summarize only new work since the previous checkpoint.

**Default rule:** If the evidence already exists and the relevant inputs have not changed, the work is complete. Move forward; do not repeat it.
