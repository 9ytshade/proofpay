# Manual Studio test: Phase 2 escrow

Use this guide after every meaningful contract change. It exercises the escrow
rules manually; the direct test suite covers timing edge cases that are not
practical to wait for in a hosted Studio session.

## 1. Open the stable hosted environment

Open [GenLayer Studionet](https://studio.genlayer.com). Studionet is the stable
hosted development environment. Use Studio-dev only when deliberately testing
the matching v0.6 release-candidate toolchain; it may reset.

## 2. Create three funded test accounts

Create or select three accounts from the account selector in the header:

- `Client Ada`: creates and funds the bounty.
- `Builder Tunde`: submits the first proof.
- `Builder Mei`: submits a competing proof.

Use the built-in faucet (the droplet icon in the account selector) to fund all
three accounts with test GEN. Never use a wallet or funds intended for a live
network.

## 3. Load and deploy ProofPay

1. In the left sidebar, choose **Contracts**.
2. Select **New Contract**, then **Add From File**.
3. Upload [proofpay.py](../contracts/proofpay.py).
4. Open the uploaded contract and choose **Run and Debug** (or the editor play
   icon).
5. `ProofPay.__init__` has no parameters, so leave constructor inputs empty.
6. Select `Client Ada` as the active account and click **Deploy**.
7. Wait for a successful finalized transaction. Save the resulting contract
   address and transaction ID.

Deployment is a consensus transaction. A finalized transaction must still show
successful execution before you use the returned contract address.

## 4. Create a funded bounty as Ada

In the deployed contract panel, expand the `create_bounty` write method. Enter
these arguments:

| Input | Value |
| --- | --- |
| `title` | `ProofPay landing page` |
| `brief` | `Build a responsive waitlist landing page with an email form and deploy it publicly.` |
| `criteria` | `Responsive on mobile` then a newline, `Email form submits successfully`, then a newline, `Public deployment matches the brief` |
| `deadline` | A Unix timestamp at least one day in the future |

Set the transaction's attached **value** to a positive test-GEN amount. The
contract stores that native amount as the bounty reward; zero will revert.
Submit the transaction and wait for successful execution.

Then expand `get_bounty`, enter bounty id `1`, and call it. Confirm:

- `client` is Ada's account address;
- `status` is `open`;
- `submission_count` is `0`;
- `reward` matches the value you attached.

## 5. Submit two competing proofs

Switch the active account to `Builder Tunde`. Open `submit_proof` and enter:

| Input | Value |
| --- | --- |
| `bounty_id` | `1` |
| `repository_url` | `https://github.com/octocat/Hello-World` |
| `deployment_url` | `https://example.com/` |
| `summary` | `Implemented the public responsive landing page and deployed the email capture flow.` |

Execute, wait for success, then call `get_submission(1, 1)`. Confirm the
builder address is Tunde's and status is `submitted`.

Switch to `Builder Mei` and repeat with the same bounty id but a different
public GitHub URL and summary. Call `get_bounty(1)` again: it should now show
`submission_count: 2`. This proves that a single bounty accepts competing
builders and that the contract is not single-user.

## 6. Verify key protections

Use the Studio transaction output to confirm each of these safely reverts:

- As Ada, try `submit_proof` for bounty `1`: expected error, `Client cannot
  submit to own bounty`.
- As Ada, try `cancel_bounty(1)`: expected error, `Bounty with submissions
  cannot be cancelled`.
- Create bounty `2` as Ada with a positive value but do not submit proof. Switch
  to Tunde and try `cancel_bounty(2)`: expected error, `Only the client can
  cancel this bounty`.
- Switch back to Ada and call `cancel_bounty(2)`: it should succeed and its
  status should become `cancelled`.
- Try a repository URL outside `https://github.com/` or a non-HTTPS deployment
  URL: each must revert before being stored.

## 7. Inspect every transaction

For each deploy/write transaction, open it in Studio's **Transactions** panel
and confirm both:

1. lifecycle progresses to `FINALIZED`; and
2. execution is `SUCCESS` (or the expected revert for a negative test).

Save the contract address, test account addresses, and transaction IDs in your
working notes. Do not treat a finalization alone as proof of success.

## What this phase intentionally does not do

Phase 2 does not yet adjudicate evidence or pay a builder. The two submissions
remain `submitted` and the reward stays in escrow. Phase 3 will add GenLayer
web/LLM consensus, a structured verdict, approval, and finality-safe payout.

The seven-day expiry-refund condition and deadline test are covered by direct
tests now. We will test them on a controllable local Studio environment rather
than waiting days on hosted Studionet.

