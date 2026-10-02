# ProofPay

**ProofPay** is an AI-native escrow marketplace for public software bounties built on GenLayer.

Clients fund bounties in GEN, builders submit public proof (GitHub commit + source manifest + live HTTPS deployment), and a GenLayer Intelligent Contract adjudicates each acceptance criterion via validator consensus.

## Current Status
- **Contract version:** 2.0.0
- **Contract address:** `0x5CCe24450B88BFC705794830C717c2D511253bF5`
- **Network:** GenLayer Studionet (chain 61999)
- **Production app:** [https://proofpay-gamma.vercel.app](https://proofpay-gamma.vercel.app/)
- **CI Status:** [![CI](https://github.com/9ytshade/proofpay/actions/workflows/ci.yml/badge.svg)](https://github.com/9ytshade/proofpay/actions/workflows/ci.yml) (Latest run: [37042661975](https://github.com/9ytshade/proofpay/actions/runs/37042661975))
- **Deployment & Audit Record:** [STUDIONET_V2_RUN_2026-10-01.md](./docs/STUDIONET_V2_RUN_2026-10-01.md)
- **Toolchain:** GenLayer CLI 0.39.1 · genlayer-py 0.16.3 · genlayer-test 0.29.2
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + genlayer-js SDK
- **Legacy contract:** `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` (historical reference only)

## Project Structure
- `contracts/` — GenLayer Intelligent Contracts in Python.
- `web/` — Next.js frontend application.
- `docs/` — Documentation, release checklists, and specs.
- `scripts/` — Automation and tooling scripts.
- `tests/` — Direct Mode and integration tests.

## Key Features
- **Wallet Connection:** Connect via MetaMask to GenLayer Studionet.
- **Bounty Desk:** Automatic discovery via `get_bounty_count()` + batch reads.
- **Create Bounty:** Define title, brief, up to 5 criteria, deadline, and GEN reward.
- **Submit Proof:** Builders submit a GitHub commit URL, source evidence manifest (1–6 files), HTTPS deployment, and a summary.
- **Criterion-Level Adjudication:** On-chain validator consensus evaluates each criterion independently as PASS / FAIL / UNDETERMINED.
- **Deterministic Outcome:** 100% of criteria must PASS for approval. Any FAIL → rejected. Any UNDETERMINED (no FAIL) → retryable.
- **Immutable Source Identity:** Evidence pinned to a canonical GitHub commit SHA — validators fetch specific source files, not mutable web pages.
- **Bounded Evidence Paths:** 1–6 explicit file paths with allowed extensions, validated on-chain.
- **Transaction Lifecycle Tracker:** Real-time finalization status with rollback detection.
- **Contract Version Safety:** Frontend blocks writes if contract version ≠ 2.0.0.
- **Undetermined Handling:** Distinguishes application-level UNDETERMINED (on-chain, retryable) from network-level failure (no state change).
- **Search & Filter:** Filter by All, Submitted, Approved, Rejected, Undetermined.
- **Dark/Light Theme:** Fully mobile responsive UI.

## How It Works (Bounty Lifecycle)
1. **Create & Fund:** Client posts a public brief with acceptance criteria and funds the reward in GEN to an escrow contract.
2. **Submit Proof:** Builder submits a GitHub commit URL, source file manifest, live deployment URL, and a summary.
3. **Adjudicate:** A review is triggered and GenLayer validators evaluate each criterion against the source code and live deployment.
4. **Settle:** The contract pays the builder if all criteria PASS, or keeps the bounty open if rejected or undetermined.

## Quick Start

### Smart Contract
Deploy the contract to GenLayer Studionet using the GenLayer CLI:
```bash
npx genlayer deploy contracts/proofpay.py
```

### Run Tests
```bash
# Contract linter
genvm-lint contracts/proofpay.py

# Direct Mode tests
python -m pytest tests/direct/ -v

# Frontend tests + lint + build
cd web && npm run check
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
- [Contract Specification](./docs/CONTRACT_SPEC.md)
- [MVP Specification](./docs/MVP_SPEC.md)
- [Release Checklist](./docs/RELEASE_CHECKLIST.md)
- [Network Integration (archived)](./docs/NETWORK_INTEGRATION.md)

---
© 9YTSHADE
