# ProofPay

**ProofPay** is an AI-native escrow marketplace for public software bounties built on GenLayer. 

Clients fund bounties in GEN, builders submit public proof (GitHub repo + live HTTPS deployment), and a GenLayer Intelligent Contract adjudicates the evidence via validator consensus.

## Current Status
- **Status:** Studionet MVP
- **Contract:** `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` on GenLayer Studionet (Chain 61999)
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + genlayer-js SDK
- **Network:** GenLayer Studionet (test network)

## Project Structure
- `contracts/` - GenLayer Intelligent Contracts in Python.
- `web/` - Next.js frontend application.
- `docs/` - Documentation, release checklists, and specs.
- `scripts/` - Automation and tooling scripts.
- `tests/` - Tests for smart contracts and the application.

## Key Features
- **Wallet Connection:** Connect via MetaMask to GenLayer Studionet.
- **Bounty Desk:** Automatic contract state discovery scanning sequential IDs.
- **Create Bounty:** Define title, brief, up to 5 criteria, deadline, and GEN reward.
- **Submit Proof:** Builders submit GitHub URL, HTTPS deployment, and a summary.
- **Intelligent Review:** On-chain validator consensus adjudication.
- **Transaction Lifecycle Tracker:** Real-time finalization status with rollback detection.
- **Review Transaction Tracking:** Explorer links and copy-to-clipboard on review cards.
- **Undetermined Reviews:** Safe handling for reverted reviews (e.g., unreachable evidence).
- **Search & Filter:** Filter by All, Submitted, Approved, Rejected, Undetermined.
- **Dark/Light Theme:** Fully mobile responsive UI with URL normalization.

## How it works (Bounty Lifecycle)
1. **Create & Fund:** Client posts a public brief and funds the reward in GEN to an escrow contract.
2. **Submit Proof:** Builder works on the bounty and submits a GitHub repo and live deployment URL.
3. **Adjudicate:** A review is triggered and GenLayer validators evaluate the public links against the criteria.
4. **Settle:** The contract pays the builder if approved or keeps it open if rejected/undetermined.

## Quick Start

### Smart Contract
Deploy the contract to GenLayer Studionet using the GenLayer CLI:
```bash
genlayer deploy contracts/proofpay.py
```

### Web App
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000` to interact with ProofPay.

## Documentation
- [Frontend README](./web/README.md)
- [Release Checklist](./docs/RELEASE_CHECKLIST.md)

---
© 9YTSHADE
