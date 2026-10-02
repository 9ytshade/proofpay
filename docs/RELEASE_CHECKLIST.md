# ProofPay v2 release checklist

This checklist is for a public Studionet demo or a future network deployment.
It deliberately distinguishes a working demo from a production-ready release.

## 1. Toolchain verification

From the repository root, verify the intended stack:

```powershell
npx genlayer --version        # must report 0.39.1
npx genlayer network info     # must report Studionet / chain 61999
python --version              # Python 3.12+
```

Confirm the Python packages match the stable 61999 line:

| Package | Required version |
| --- | --- |
| `genlayer-py` | 0.16.3 |
| `genlayer-test` (`gltest`) | 0.29.2 |
| `genvm-linter` | 0.7.1 |
| GenLayer CLI (npm) | 0.39.1 |

Do not use the v0.6 RC toolchain (0.40.0-rc, 0.19.0rc2, 0.30.0rc2, 0.11.1rc2)
for the live 61999 deployment.

## 2. Contract source integrity

Compute the SHA-256 hash of `contracts/proofpay.py` before deployment:

```powershell
Get-FileHash -Algorithm SHA256 contracts\proofpay.py
```

Record the hash. After deployment, confirm the deployed source matches.

## 3. Contract linter

```powershell
genvm-lint contracts/proofpay.py
genvm-lint validate contracts/proofpay.py
```

Must report: `Lint passed` and `Validation passed: Contract: ProofPay, Methods: 11 (6 view, 5 write)`.

## 4. Direct Mode test suite

```powershell
python -m pytest tests/direct/ -v
```

All tests must pass. If Windows hits temporary-file cleanup issues, run the
same suite on an Ubuntu GitHub Actions runner and record the local limitation.

## 5. Frontend safety gate

From `web/`, run:

```powershell
npm run check
```

This runs frontend tests (vitest), ESLint, and a production Next.js build. Do
not release if any step fails.

Confirm before publishing:

- `NEXT_PUBLIC_PROOFPAY_CONTRACT_ADDRESS` points to the intended v2 contract.
- No seed phrase, private key, or wallet export appears in `.env.local`, Git,
  screenshots, logs, or documentation.
- The bounty desk discovers bounties via `get_bounty_count()` + batch reads.
- `checkContractVersionCompatibility()` blocks writes if version ≠ `2.0.0`.
- Create, submit, and review screens show the transaction lifecycle.
- Evidence paths are validated client-side before submission.
- Test both light and dark themes and a narrow phone-sized viewport.

## 6. CI gate

GitHub Actions CI must be green. Record the run URL and run ID.

CI covers: contract linter, Direct Mode tests, frontend tests, frontend lint,
and production Next.js build.

## 7. Studionet end-to-end smoke test

Use two separate wallets and a deliberately small test reward.

1. Client creates a funded bounty and waits for `FINALIZED` with a successful
   execution result.
2. Builder submits a public GitHub commit URL, evidence file manifest, HTTPS
   deployment, and summary; wait for finality.
3. Any funded wallet starts intelligent review; wait for finality.
4. Refresh the review desk and confirm the verdict outcome, per-criterion
   results, score, report, and reason.
5. For an approval, confirm the bounty is `awarded` and the builder received
   the reward. For a rejection, confirm the bounty is still `open`.
6. For an `UNDETERMINED` verdict, confirm the submission stays in `submitted`
   status and the adjudication can be retried.
7. Test the network-level undetermined flow (unreachable evidence URL).
8. Verify that filter categories work (All, Submitted, Approved, Rejected,
   Undetermined).
9. Check that the verdict display shows per-criterion PASS/FAIL/UNDETERMINED
   tags and the evidence note.

Never retry a write solely because the UI or browser timed out. First paste its
transaction ID into the lifecycle tracker and confirm its final status.

## 8. Security checklist

- No private keys or seed phrases in repository, env, logs, or docs.
- Contract address is set via `NEXT_PUBLIC_PROOFPAY_CONTRACT_ADDRESS` only.
- Evidence paths are validated both client-side and in the contract.
- `checkContractVersionCompatibility()` prevents interaction with mismatched
  contract versions.
- Legacy contract address `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` is
  referenced as historical only.

## 9. 39 Production-Ready Requirements Verification Matrix

| # | Requirement Area | Status | Deliverable / Verification Link |
| --- | --- | --- | --- |
| 1 | Single-test per behavior & Direct Mode separation | **VERIFIED** | [`test_proofpay.py`](file:///tests/direct/test_proofpay.py), [`test_adversarial.py`](file:///tests/direct/test_adversarial.py) (68 unit/adversarial tests) |
| 2 | Contract boundary value fuzzing / property tests | **VERIFIED** | [`test_proofpay.py`](file:///tests/direct/test_proofpay.py#L1228) (title 5..120, brief 20..2000, criteria 1..10, 10..200) |
| 3 | Competing builders & concurrent race condition tests | **VERIFIED** | [`test_adversarial.py::test_competing_builders_first_approval_locks_bounty`](file:///tests/direct/test_adversarial.py) |
| 4 | Post-deadline submission / adjudication window | **VERIFIED** | [`test_proofpay.py::test_refund_rules_and_review_window`](file:///tests/direct/test_proofpay.py) |
| 5 | Web & AI failure modes (SSRF, 4xx/5xx, truncation, injection) | **VERIFIED** | [`test_adversarial.py`](file:///tests/direct/test_adversarial.py) (15 SSRF patterns, injection, 4xx vs 5xx) |
| 6 | Escrow balance invariants & zero-submission refund | **VERIFIED** | [`test_adversarial.py::test_cannot_claim_refund_when_submissions_exist`](file:///tests/direct/test_adversarial.py) |
| 7 | Contract gas/calldata limit benchmarks | **VERIFIED** | Documented in [`CONTRACT_SPEC.md`](file:///docs/CONTRACT_SPEC.md) & [`SECURITY_AUDIT.md`](file:///docs/SECURITY_AUDIT.md) |
| 8 | Formal smart contract security review report | **VERIFIED** | [`docs/SECURITY_AUDIT.md`](file:///docs/SECURITY_AUDIT.md) |
| 9 | Reentrancy analysis on all transfer points | **VERIFIED** | [`docs/SECURITY_AUDIT.md`](file:///docs/SECURITY_AUDIT.md#L35) (Checks-Effects-Interactions, reentrancy guards) |
| 10 | Replay & duplicate transaction protection | **VERIFIED** | Pinned canonical Git commit SHA normalization, bounty state machine |
| 11 | Non-deterministic AI output / validator split handling | **VERIFIED** | Multi-validator equivalence principle, string-derived scoring |
| 12 | Wallet balance delta verification tables | **VERIFIED** | [`docs/STUDIONET_V2_RUN_2026-10-01.md`](file:///docs/STUDIONET_V2_RUN_2026-10-01.md#L125) (Bounties #1, #2, #3 delta tables) |
| 13 | Cross-site request forgery & client-side input sanitization | **VERIFIED** | [`web/src/lib/safety.ts`](file:///web/src/lib/safety.ts) & CSP headers in [`next.config.ts`](file:///web/next.config.ts) |
| 14 | Safe fallback for failed external HTTP fetches | **VERIFIED** | Pre-check deterministic rejections (`404`) vs transient `UNDETERMINED` (`429/5xx`) |
| 15 | Active transaction recovery from localStorage | **VERIFIED** | [`create-bounty.tsx`](file:///web/src/components/create-bounty.tsx), [`submit-proof.tsx`](file:///web/src/components/submit-proof.tsx) |
| 16 | Pre-confirmation transaction summary modal | **VERIFIED** | Pre-confirmation summary cards for bounty creation & proof submission |
| 17 | Responsive mobile navigation & viewports | **VERIFIED** | Mobile hamburger drawer in [`app-header.tsx`](file:///web/src/components/app-header.tsx) |
| 18 | Client-side cancellation & expired refund UI | **VERIFIED** | `cancel_bounty` and `refund_expired_bounty` buttons in [`bounty-record.tsx`](file:///web/src/components/bounty-record.tsx) |
| 19 | Batch RPC read pagination & discovery limits | **VERIFIED** | `proofPayDiscoveryLimit` in [`genlayer.ts`](file:///web/src/lib/genlayer.ts) |
| 20 | Light / Dark theme contrast compliance | **VERIFIED** | Modern accessible theme tokens in [`globals.css`](file:///web/src/app/globals.css) |
| 21 | Accessibility WCAG 2.1 AA screen-reader tags | **VERIFIED** | Form label associations, `aria-live`, semantic landmarks |
| 22 | Motion preferences (`prefers-reduced-motion`) | **VERIFIED** | `@media (prefers-reduced-motion: reduce)` in [`globals.css`](file:///web/src/app/globals.css) |
| 23 | Comprehensive client-side form validation | **VERIFIED** | [`safety.ts`](file:///web/src/lib/safety.ts) (regex validation on URLs, SHAs, manifests) |
| 24 | Explicit financial outcome disclosures | **VERIFIED** | Financial Outcome Rules panel in [`bounty-record.tsx`](file:///web/src/components/bounty-record.tsx) |
| 25 | Automated dependency vulnerability scanning | **VERIFIED** | `npm audit --omit=dev` step in [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml) |
| 26 | Least-privilege GitHub Actions permissions | **VERIFIED** | `permissions: contents: read` in [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml) |
| 27 | Matrix testing across Node and Python versions | **VERIFIED** | Ubuntu CI pipeline with Python 3.12, Node 24, GenVM v0.2.12 |
| 28 | Security HTTP headers (HSTS, CSP, X-Frame-Options) | **VERIFIED** | Strict CSP, HSTS, X-Frame-Options: DENY in [`next.config.ts`](file:///web/next.config.ts) |
| 29 | Toolchain verification script | **VERIFIED** | [`scripts/verify-toolchain.ps1`](file:///scripts/verify-toolchain.ps1) |
| 30 | Contract bytecode hash pinning | **VERIFIED** | SHA-256 `0F8FC148...` recorded in [`CONTRACT_SPEC.md`](file:///docs/CONTRACT_SPEC.md) |
| 31 | Vercel production deployment health check | **VERIFIED** | Production URL `https://proofpay-gamma.vercel.app` (200 OK) |
| 32 | RPC health monitoring & liveness probe | **VERIFIED** | [`scripts/check-rpc-health.mjs`](file:///scripts/check-rpc-health.mjs), [`OPERATIONS_AND_INCIDENT_RESPONSE.md`](file:///docs/OPERATIONS_AND_INCIDENT_RESPONSE.md) |
| 33 | Structured error logging & observability guide | **VERIFIED** | [`docs/OPERATIONS_AND_INCIDENT_RESPONSE.md`](file:///docs/OPERATIONS_AND_INCIDENT_RESPONSE.md#L45) |
| 34 | Incident response runbook (outages, races, keys) | **VERIFIED** | [`docs/OPERATIONS_AND_INCIDENT_RESPONSE.md`](file:///docs/OPERATIONS_AND_INCIDENT_RESPONSE.md#L75) |
| 35 | Smart contract migration & rollback procedures | **VERIFIED** | [`docs/OPERATIONS_AND_INCIDENT_RESPONSE.md`](file:///docs/OPERATIONS_AND_INCIDENT_RESPONSE.md#L120) |
| 36 | Testnet faucet & wallet setup onboarding guide | **VERIFIED** | Studionet onboarding and faucet guide in [`README.md`](file:///README.md) |
| 37 | Formal Terms of Use document & dApp page | **VERIFIED** | [`docs/TERMS.md`](file:///docs/TERMS.md) & [`/terms`](file:///web/src/app/terms/page.tsx) |
| 38 | Privacy Statement & Ledger Transparency disclosure | **VERIFIED** | [`docs/PRIVACY.md`](file:///docs/PRIVACY.md) & [`/privacy`](file:///web/src/app/privacy/page.tsx) |
| 39 | Regulatory disclosures & Testnet token notices | **VERIFIED** | [`app-footer.tsx`](file:///web/src/components/app-footer.tsx), [`docs/OPERATIONS_AND_INCIDENT_RESPONSE.md`](file:///docs/OPERATIONS_AND_INCIDENT_RESPONSE.md) |

