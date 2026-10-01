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
