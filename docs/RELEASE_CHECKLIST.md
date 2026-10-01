# ProofPay MVP release checklist

This checklist is for a public Studionet demo or a future network deployment.
It deliberately distinguishes a working demo from a production-ready release.

## 1. Source and frontend preflight

From `web/`, run:

```powershell
npm run check
```

This runs the frontend safety tests, ESLint, and a production build. Do not
release if any step fails.

Confirm before publishing:

- `NEXT_PUBLIC_PROOFPAY_CONTRACT_ADDRESS` points to the intended contract.
- No seed phrase, private key, or wallet export appears in `.env.local`, Git,
  screenshots, logs, or documentation.
- The bounty desk discovers the expected finalized bounty records.
- Create, submit, and review screens show the transaction lifecycle instead of
  treating a wallet confirmation as a completed transaction.
- Test both light and dark themes and a narrow phone-sized viewport.

## 2. Studionet end-to-end smoke test

Use two separate wallets and a deliberately small test reward.

1. Client creates a funded bounty and waits for `FINALIZED` with a successful
   execution result.
2. Builder submits a public GitHub repository, HTTPS deployment, and summary;
   wait for finality.
3. Any funded wallet starts intelligent review; wait for finality.
4. Refresh the review desk and confirm the verdict, score, report, and reason.
5. For an approval, confirm the bounty is `awarded` and the selected builder
   received the reward. For a rejection, confirm the bounty is still `open`.
6. Test the undetermined review flow by submitting with an unreachable URL.
7. Verify that the review transaction hash appears on cards after review.
8. Verify that the filter categories work (All, Submitted, Approved, Rejected, Undetermined).
9. Check that the outcome modal shows the correct status (approved with score, rejected with reason, reverted with error).

Never retry a write solely because the UI or browser timed out. First paste its
transaction ID into ProofPay's lifecycle tracker and confirm its final status.

## 3. Network and fee gate

The current contract behavior is manually validated on Studionet. It is **not
production-ready** until the v0.6-compatible fee profile described in
`NETWORK_INTEGRATION.md` has been generated and reviewed.

Before any production-like deployment:

1. Run `scripts/verify-toolchain.ps1` from the repository root.
2. Generate and commit a reviewed fee profile on a compatible, fee-reporting
   environment.
3. Validate every fee-bearing branch: deployment, create bounty, submit proof,
   approval, rejection, cancellation, and refund.
4. Add current fee estimates to every frontend write before exposing it to real
   funds.
5. Repeat the end-to-end smoke test against the intended network and contract
   address.

## 4. Known test-environment limitation

The contract's direct pytest suite previously passed under the earlier local
toolchain. Under the pinned v0.6 release-candidate toolchain on Windows, its
direct runner fails during contract load with `unexpected end of memory`, before
contract execution. This is an environment/runtime blocker, not a passing test.

For release confidence, run that suite on a compatible Linux/WSL environment
or rely on a compatible Studio network smoke test until the Windows runner issue
is resolved. Keep the existing manual Studionet records as behavioral evidence,
but do not treat them as a replacement for v0.6 fee profiling.
