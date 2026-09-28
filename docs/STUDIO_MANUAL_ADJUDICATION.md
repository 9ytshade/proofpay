# Manual Studio test: Phase 3 intelligent adjudication

This exercise tests the feature that makes ProofPay a GenLayer application:
validators inspect public web evidence and settle the escrow from a structured
verdict.

## Important: deploy a new contract

The Phase 2 contract already deployed on Studionet at
`0x213C1a120Fd127dB68A720592c38372f4f0F54c5` cannot be upgraded in place. It
does not contain `adjudicate_submission` or `get_verdict`. Upload and deploy
the current [proofpay.py](../contracts/proofpay.py) as a new contract, then
record its new address and deployment transaction.

## 1. Set up accounts and deploy

Follow sections 1–3 of [the Phase 2 Studio guide](STUDIO_MANUAL_TEST.md):

1. Open [GenLayer Studionet](https://studio.genlayer.com).
2. Fund a client account and at least two builder accounts with the built-in
   test-GEN faucet.
3. Upload the current `contracts/proofpay.py` using **Contracts → New Contract
   → Add From File**.
4. Choose **Run and Debug** and deploy from the client account. The constructor
   has no arguments.
5. Wait for both successful execution and finalization.

## 2. Create a deliberately verifiable bounty

As the client, call `create_bounty` with a positive attached GEN value and the
following values:

| Input | Value |
| --- | --- |
| `title` | `Next.js public evidence check` |
| `brief` | `Verify that the submitted public repository and live website provide evidence of the Next.js framework.` |
| `criteria` | `Public GitHub repository is accessible` then a newline, `Public deployment loads through HTTPS`, then a newline, `Deployment describes the Next.js framework` |
| `deadline` | Unix timestamp at least one day in the future |

Call `get_bounty(1)` afterward and confirm its status is `open`.

## 3. Run an approval path

Switch to Builder Tunde and call `submit_proof` with:

| Input | Value |
| --- | --- |
| `bounty_id` | `1` |
| `repository_url` | `https://github.com/vercel/next.js` |
| `deployment_url` | `https://nextjs.org/` |
| `summary` | `The public Next.js repository and official website demonstrate the requested framework evidence.` |

After the submission is finalized, call `adjudicate_submission(1, 1)`. This is
a real consensus transaction: allow more time than an ordinary storage write.

Expected outcome: an approval is likely because the evidence directly matches
the criteria. The result includes `approved`, `required_criteria_passed`,
`score`, `criteria_report`, and `reason`.

Then verify:

1. `get_submission(1, 1)` reports `status: approved`, a nonzero `score`, and a
   nonzero `verdict_id`.
2. `get_verdict(verdict_id)` shows the criterion report and explanation.
3. `get_bounty(1)` reports `status: awarded` and
   `approved_submission_id: 1`.
4. In **Transactions**, inspect the adjudication transaction: it must show a
   successful execution and progress to `FINALIZED`.
5. Check the builder's test-GEN balance to confirm the escrow reward was
   transferred after the accepted result.

The exact score and wording are intentionally not fixed—the validators assess
live public content—but approval requires all criteria and a score of at least
80.

## 4. Run a rejection-and-resubmission path

Create bounty `2` with the same inputs. Switch to Builder Mei and submit:

| Input | Value |
| --- | --- |
| `bounty_id` | `2` |
| `repository_url` | `https://github.com/vercel/next.js` |
| `deployment_url` | `https://example.com/` |
| `summary` | `The repository is public, but this deployment intentionally does not demonstrate the requested framework.` |

Call `adjudicate_submission(2, 1)`. Expected outcome: rejection because the
deployment does not describe Next.js. Verify that the bounty remains `open`
and the submission is `rejected` with an actionable reason.

Then submit a corrected proof from Mei or the other builder using
`https://nextjs.org/` as the deployment URL. It receives submission id `2`.
Adjudicate that submission and verify the bounty becomes `awarded` only once.

## 5. Safety checks

After an approved submission, confirm the contract rejects:

- a second `adjudicate_submission` call for the same submission;
- any new `submit_proof` call for that bounty;
- `cancel_bounty` for that bounty.

Also inspect the verdict reason. It should ground its assessment in the brief
and public evidence. If a public page contains instructions aimed at the
model, the contract prompt explicitly treats them as untrusted evidence, never
as instructions.

## Interpreting an undetermined transaction

Consensus can disagree on subjective or changing web evidence. If an
adjudication does not reach accepted finality, do not assume payment occurred:
open the transaction details, record its status, and confirm the bounty and
builder balance through read methods. The contract only changes its permanent
state after a successful consensus result.

