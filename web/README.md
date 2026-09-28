# ProofPay web application

The ProofPay frontend is a Next.js application. It now includes the public
marketplace shell plus a browser-wallet connection to GenLayer Studionet.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Wallet connection

ProofPay uses the GenLayer JavaScript SDK version compatible with the currently
deployed Studionet contract. Select
**Connect wallet** to authorize the wallet, switch it to Studionet, and install
the GenLayer wallet capability when prompted. The app only reads the selected
public address and its GEN balance; it never asks for or stores a private key.

Copy `.env.example` to `.env.local` if you want to override the public contract
address or discovery limit used by the app. The marketplace reads `get_bounty`
from finalized contract state, without requiring a wallet connection. It scans
the contract's sequential bounty IDs automatically, so creators no longer add
new bounty IDs to `.env.local`.

## Create a bounty

After connecting MetaMask in the header, use **Post a bounty** to enter the
title, public brief, one to five acceptance criteria, deadline, and GEN reward.
The reward is passed as the transaction value to `create_bounty`, so it is the
escrowed bounty amount—not a form field stored off-chain. ProofPay shows the
submitted transaction hash while GenLayer reaches finality.

## Submit proof

Switch MetaMask to a builder account before selecting an open bounty. Submit a
public GitHub URL, live HTTPS deployment URL, and a concise proof summary. The
contract rejects a bounty creator's own submission and later uses these public
links for intelligent adjudication.

## Safety checks

Run the complete frontend safety gate before a demo or release:

```powershell
npm run check
```

It tests critical form rules, lints the app, and produces a production build.
See [`../docs/RELEASE_CHECKLIST.md`](../docs/RELEASE_CHECKLIST.md) for the
manual two-wallet and fee-profile release gates.

## Intelligent review and settlement

The review desk reads each finalized submission and can call
`adjudicate_submission`. This is a live GenLayer consensus transaction and may
consume network fees. Once final, ProofPay displays the validator score,
criteria report, and reason. An approved verdict transfers the escrowed reward;
a rejected verdict leaves the bounty open for another builder attempt.

## Design direction

ProofPay uses a public-case-file aesthetic: warm paper, ink-black typography,
cobalt action signals, and evidence-led bounty cards. The intent is to make the
product feel like a trustworthy public record rather than a generic crypto
dashboard.
