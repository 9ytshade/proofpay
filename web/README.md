# ProofPay web application

The ProofPay frontend is a Next.js application. It includes the public
marketplace shell plus a browser-wallet connection to GenLayer Studionet.

## Routes and Multi-Route Structure
- **Home:** `/`
- **Bounties:** `/bounties`
- **Create Bounty:** `/bounties/create`
- **Submit Proof:** `/submit` and `/bounties/[id]/submit`
- **Reviews:** `/reviews` and `/reviews/[bountyId]/[submissionId]`
- **Protocol Guide:** `/protocol`

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Contract version safety

The frontend calls `checkContractVersionCompatibility()` before every write
transaction (`create_bounty`, `submit_proof`, `adjudicate_submission`). If the
on-chain `get_contract_version()` does not return `"2.0.0"`, the operation is
blocked with an error message. This prevents interaction with an incompatible
contract.

## Wallet connection

ProofPay uses the GenLayer JavaScript SDK version compatible with the currently
deployed Studionet contract. Select **Connect wallet** to authorize the wallet,
switch it to Studionet, and install the GenLayer wallet capability when
prompted. The app only reads the selected public address and its GEN balance;
it never asks for or stores a private key.

Copy `.env.example` to `.env.local` if you want to override the public contract
address. The marketplace reads `get_bounty_count()` from finalized contract
state, without requiring a wallet connection. It then reads bounties in batches
of 10 via `get_bounty()`.

## Create a bounty

After connecting MetaMask in the header, use **Post a bounty** to enter the
title, public brief, one to five acceptance criteria, deadline, and GEN reward.
The reward is passed as the transaction value to `create_bounty`, so it is the
escrowed bounty amount — not a form field stored off-chain.

## Submit proof

Switch MetaMask to a builder account before selecting an open bounty. Submit:

- **GitHub commit URL:** A full commit URL in the form
  `https://github.com/{owner}/{repo}/commit/{40-char-sha}`. The contract
  parses the owner, repository, and immutable commit SHA.
- **Source evidence manifest:** 1–6 file paths (one per line) within the
  repository, validated against allowed extensions. Validators fetch these
  files from `raw.githubusercontent.com` at the pinned commit.
- **HTTPS deployment URL:** A public live deployment.
- **Summary:** A concise explanation of the completed work.

Evidence paths are validated client-side (`validateEvidencePaths()`) before
submission and again on-chain by the contract.

## Safety checks

Run the complete frontend safety gate before a demo or release:

```powershell
npm run check
```

It tests critical form rules, lints the app, and produces a production build.
See [`../docs/RELEASE_CHECKLIST.md`](../docs/RELEASE_CHECKLIST.md) for the
full release gate.

## Intelligent review and criterion-level verdicts

The review desk reads each finalized submission and can call
`adjudicate_submission`. This is a live GenLayer consensus transaction and may
consume network fees.

Validators evaluate each acceptance criterion independently, producing
per-criterion results:

| Result | Meaning |
| --- | --- |
| `PASS` | Criterion satisfied. |
| `FAIL` | Criterion not satisfied. |
| `UNDETERMINED` | Insufficient evidence to determine. |

The deterministic outcome rule:
- All criteria PASS → **APPROVED** (builder paid, bounty awarded)
- Any criterion FAIL → **REJECTED** (bounty stays open)
- Any criterion UNDETERMINED (no FAIL) → **UNDETERMINED** (retryable)

Review cards display the per-criterion tags, score, reason, evidence note,
commit SHA, and evidence paths as pill tags.

### Two kinds of undetermined

The frontend distinguishes two undetermined states:

1. **Application-level UNDETERMINED:** The verdict outcome is `UNDETERMINED`,
   recorded on-chain. The submission stays in `submitted` status. The
   adjudication can be retried.

2. **Network-level failure:** The consensus transaction itself reverted or
   timed out. No on-chain state change occurred. The submission is unchanged.

Each state gets a distinct badge, callout color, and action button.

## Design direction

ProofPay uses a public-case-file aesthetic: warm paper, ink-black typography,
cobalt action signals, and evidence-led bounty cards. The intent is to make the
product feel like a trustworthy public record rather than a generic crypto
dashboard.
