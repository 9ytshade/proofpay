# ProofPay Privacy Statement & Ledger Transparency (Item 38)

**Last Updated:** October 2, 2026  
**Protocol Version:** 2.0.0

ProofPay is committed to user privacy, cryptographic transparency, and minimal data collection. This document explains what information is processed when you interact with the ProofPay smart contract and web application interface.

---

## 1. Blockchain Ledger Transparency
ProofPay operates on top of the GenLayer public blockchain. By design, blockchains are decentralized, distributed, and immutable ledgers.

### 1.1 Data Recorded Permanently On-Chain
When you interact with the ProofPay intelligent contract, the following information is permanently published to the GenLayer blockchain:
- **Public Wallet Addresses:** The address of the bounty creator (client) and the proof submitter (builder).
- **Bounty Metadata:** Bounty title, detailed specification brief, criteria strings, reward amount in GEN, and expiration deadline.
- **Proof & Evidence Records:** Commit URL, canonical 40-character Git SHA, file manifest paths, deployment URL, and summary notes.
- **Consensus Verdicts:** Multi-validator LLM evaluation results, criterion-by-criterion scores, and payout transaction hashes.

> [!IMPORTANT]
> **Data Immutability Notice:** Once confirmed by network validators, on-chain data cannot be edited, deleted, hidden, or rolled back by anyone, including the protocol creators. Never include personal identification, passwords, private keys, secret API tokens, or confidential corporate data in bounty briefs or proof submissions.

---

## 2. Web Application & Client-Side Storage
The ProofPay web application (`https://proofpay-gamma.vercel.app`) runs client-side in your browser.

### 2.1 Browser LocalStorage Usage
ProofPay uses browser `localStorage` solely to enhance local user experience:
1. **Transaction & Draft State Restoration (Item 15):** Form inputs and active transaction hashes for bounty creation and proof submission are saved locally under keys such as `proofpay:pending_bounty` and `proofpay:pending_proof`. If your browser refreshes or your connection drops during transaction confirmation, your draft and status are restored automatically.
2. **Visual Theme Preferences:** Stores your chosen color mode (`light` or `dark`).

### 2.2 What We Do NOT Store
- We do **not** store private keys, seed phrases, or wallet passwords. All cryptographic signing is delegated to your local Web3 wallet provider (e.g., MetaMask).
- We do **not** store user email addresses, names, or physical addresses.
- We do **not** sell, rent, or monetize user data.

---

## 3. Analytics, Tracking & Cookies
- **Zero Third-Party Advertising Pixels:** ProofPay does not include Facebook Pixel, Google AdSense, or third-party marketing beacons.
- **No Fingerprinting:** ProofPay does not perform device fingerprinting or cross-site tracking.

---

## 4. Third-Party Network Services
When using ProofPay, your browser communicates directly with third-party infrastructure providers:
1. **GenLayer RPC Nodes:** Transmits read queries and signed transactions to GenLayer JSON-RPC endpoints (`https://studio.genlayer.com/api`).
2. **GitHub:** During validator evaluation, GenLayer consensus nodes retrieve raw source code from public GitHub endpoints (`raw.githubusercontent.com`).
3. **Web3 Wallet Providers:** Your local wallet provider (e.g., MetaMask) handles key management and signature prompts subject to their independent privacy policies.
4. **Vercel Hosting:** The web interface is hosted as static assets via Vercel CDN, which may log standard server access logs (IP address, user-agent) for security and DDoS mitigation.

---

## 5. Contact & Questions
For technical questions or protocol audits, consult the open-source repository at [GitHub: 9ytshade/proofpay](https://github.com/9ytshade/proofpay).
