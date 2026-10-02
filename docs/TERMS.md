# ProofPay Terms of Use (Item 37)

**Last Updated:** October 2, 2026  
**Protocol Version:** 2.0.0

Please read these Terms of Use ("Terms") carefully before using ProofPay, including the smart contracts deployed on GenLayer networks and the web application interface located at `https://proofpay-gamma.vercel.app` (collectively, the "Protocol").

---

## 1. Acceptance of Terms
By connecting a Web3 wallet, creating a bounty, submitting proof of work, or triggering smart contract functions on ProofPay, you agree to be bound by these Terms. If you do not agree to these Terms, do not interact with the Protocol.

---

## 2. Nature of the Protocol
ProofPay is a decentralized, non-custodial software application running on the GenLayer blockchain.
1. **Autonomous Intelligent Contracts:** Bounties, submissions, evaluations, and escrow payouts are executed autonomously by GenVM intelligent contracts via multi-validator LLM consensus.
2. **No Human Intermediary:** There is no human operator, central administrator, escrow agent, or mediator managing your transactions.
3. **No Right of Appeal:** All validator consensus verdicts (`APPROVED`, `REJECTED`, or `UNDETERMINED`) are finalized on-chain according to the mathematical consensus rules of the GenLayer network. There is no manual appeals board, customer support arbitration, or judicial review process.

---

## 3. Bounty Creation & Client Obligations
When you create a bounty as a "Client":
1. **Irrevocable Escrow Funding:** You must deposit the full reward amount in GEN at the moment of bounty creation. These funds remain locked in the intelligent contract until either:
   - A builder submits valid proof that achieves consensus approval (`APPROVED`), triggering an immediate payout to that builder.
   - You cancel the bounty before any builder has submitted proof (`cancel_bounty`).
   - The bounty deadline and the review grace window expire without an approved submission, permitting a refund (`refund_expired_bounty`).
2. **Criteria Definition:** You are solely responsible for formulating clear, objective, and verifiable acceptance criteria (1 to 10 criteria, 10 to 200 characters each). Vague, contradictory, or subjective criteria increase the likelihood of `UNDETERMINED` or unexpected validator consensus results.
3. **External Evidence Risk:** You acknowledge that builders may submit live deployment URLs. Web hosts, server certificates, and third-party APIs can change or become unavailable after submission. The Protocol evaluates external evidence at the time of validator consensus.

---

## 4. Proof Submission & Builder Obligations
When you submit work as a "Builder":
1. **Canonical Commit Binding:** You must supply a valid GitHub commit URL with a 40-character hexadecimal commit hash. The Protocol verifies raw repository evidence pinned to that exact commit.
2. **Accuracy of Manifests:** You must specify 1 to 10 relative file paths in your evidence manifest. Traversal attempts (`..`) or disallowed file extensions will cause immediate transaction rejection.
3. **Prohibition of Exploits:** You must not submit malicious payloads, SSRF attempts against internal IP ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`), prompt injection attacks, or deceptive redirect URLs. The Protocol implements strict input sanitization, and adversarial attempts will be rejected.
4. **Race Conditions:** Bounties remain open to all builders until an approved claim is reached. If multiple builders submit proofs for the same bounty, the first proof to achieve consensus approval receives the full reward, locking out subsequent submissions. Submitting work does not guarantee compensation.

---

## 5. Token Utility & Disclaimers
1. **Testnet / Studionet Tokens:** All transactions on GenLayer Studionet (`chain_id=61999`) or Testnet utilize test tokens with zero monetary value. Test tokens do not represent legal tender, securities, or store-of-value instruments.
2. **Gas Fees:** All on-chain actions require network execution fees (gas) determined by the GenLayer network. ProofPay has no control over gas prices or network congestion.

---

## 6. Disclaimer of Warranties
THE PROTOCOL IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT.

THE DEVELOPERS AND CONTRIBUTORS DO NOT WARRANT THAT:
1. THE SMART CONTRACTS ARE COMPLETELY FREE OF BUGS, DELAYS, OR CONSENSUS CONVERGENCE FAILURES.
2. THIRD-PARTY INFRASTRUCTURE (GITHUB APIS, CLOUDFLARE, RPC NODES, WEB HOSTS) WILL BE UNINTERRUPTED OR TIMELY.
3. VALIDATOR LLM REASONING WILL ACCURATELY MIRROR SUBJECTIVE HUMAN EXPECTATIONS IN EVERY EDGE CASE.

---

## 7. Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE PROTOCOL CONTRIBUTORS, DEVELOPERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS TO OR USE OF THE PROTOCOL.

---

## 8. Modifications
These Terms may be updated periodically to reflect contract version deployments, protocol updates, or network upgrades. Continued interaction with the Protocol constitutes acceptance of updated terms.
