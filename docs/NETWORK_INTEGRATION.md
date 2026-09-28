# Phase 4: network integration

## Purpose

This project uses the GenLayer Consensus v0.6 release-candidate family for
preview validation. It is intentionally separate from the prior Studionet
manual-test deployments, which validate the contract behavior but do not prove
v0.6 fee submission.

## Pinned release family

| Component | Project pin |
| --- | --- |
| `genlayer-py` | `0.19.0rc2` |
| `genlayer-test` | `0.30.0rc2` |
| `genvm-linter` | `0.11.1rc2` |
| GenLayer CLI | `0.40.0-rc.3` (project-local npm dependency) |

Never mix these preview tools with stable components for a Studio-dev test.

## Environments

| Environment | Chain ID | Use |
| --- | ---: | --- |
| Localnet | 61127 by default | Fast tests and fee profiling. |
| Studionet | 61999 | Stable hosted manual development. |
| Studio-dev | 61997 | v0.6 preview validation only; resets are expected. |
| Bradbury | See current network docs | Persistent, production-like testnet validation after compatible promotion. |

Use the explicit `studio-dev` alias and matching SDK chain definition for
Studio-dev. Do not point a stable Studionet setup at the Studio-dev RPC.

## Setup

From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
npm install
.\scripts\verify-toolchain.ps1
```

The CLI is installed locally, so it is invoked through `npm run genlayer --`.
This avoids changing a globally installed CLI used by other projects.

## Fee-profile workflow

The profile is a committed, test-derived description of representative resource
use. It is not a hard-coded GEN price and must be regenerated whenever the
contract, GenVM, Studio, or fee policy materially changes.

1. Run representative contract tests on a fee-reporting local Studio or
   compatible preview environment.
2. Generate `fee-profile.json` with the matching `gltest --fee-profile` flow.
3. Include every cost-relevant branch: deployment, `create_bounty`,
   `submit_proof`, successful and rejected `adjudicate_submission`,
   cancellation, and expiry refund.
4. Check the generated `fee-profile.json` into this repository after review.
5. At submission time, use the SDK/CLI to turn the chosen profile entry into a
   live estimate. Pass its returned `distribution` and `feeValue` unchanged.

The fee deposit is distinct from ProofPay's bounty reward. A client funding a
bounty must have enough balance for both the payable `value` sent to escrow and
the transaction's fee deposit.

## Preview deployment checklist

1. Verify the pinned toolchain with `scripts/verify-toolchain.ps1`.
2. Configure a dedicated test account locally using the CLI; never put its key
   in `.env`, a command-line argument, a script, or this repository.
3. Select and inspect the preview network:

   ```powershell
   npm run genlayer -- network set studio-dev
   npm run genlayer -- network info
   ```

4. Generate/review the fee profile and make sure its deployment entry exists.
5. Deploy `contracts/proofpay.py` using the matching CLI and the measured
   profile. Keep the returned transaction ID; a timeout after submission is not
   permission to deploy again.
6. Wait for finalization and require both a successful lifecycle status and a
   successful execution result before recording the new address.
7. Run the Phase 3 manual adjudication exercise against the new deployment.

## Frontend integration contract

The frontend in Phase 5 must:

- read final state for financial/accounting screens;
- use a checked-in profile to obtain a current SDK fee estimate before each
  deploy or write;
- show the bounty value, fee deposit, consumed fee, and refunded fee as
  separate values;
- track an existing transaction ID to finalization instead of blindly retrying
  a timed-out write; and
- display success only after the transaction's execution result is successful,
  not merely accepted/finalized.

## Current status

- Studionet behavior: validated manually in Phase 2 and Phase 3 records.
- Preview v0.6 tooling: pinned in this repository.
- Fee profile: pending generation on a fee-reporting compatible environment.
- Studio-dev deployment: pending the fee-profile run.

