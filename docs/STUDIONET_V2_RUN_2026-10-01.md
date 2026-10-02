# ProofPay v2 Studionet Deployment & Live Verification Record — 2026-10-02

## Repository

| Property | Value |
| --- | --- |
| Branch | `main` |
| Repository | https://github.com/9ytshade/proofpay |
| CI Run | [37042661975](https://github.com/9ytshade/proofpay/actions/runs/37042661975) (Status: **SUCCESS / GREEN**) |
| Contract Job | `✓ Contract linter and Direct Mode tests in 3m16s (ID 110945388453)` |
| Frontend Job | `✓ Frontend tests, lint, and build in 35s (ID 110945388759)` |

## Contract Source

| Property | Value |
| --- | --- |
| Source file | `contracts/proofpay.py` |
| SHA-256 | `0F8FC148EE575AFCE33A24144291BDBDF386E1224ED384AB249D32B382E023A7` |
| Version | `2.0.0` |
| Methods | 11 (6 view, 5 write) |

## Toolchain

| Component | Version |
| --- | --- |
| GenLayer CLI | 0.39.1 (repository-local npm) |
| `genlayer-py` | 0.16.3 |
| `genlayer-test` | 0.29.2 |
| `genvm-linter` | 0.7.1 |
| Python | 3.14.2 |
| Node.js | 24.13.0 |
| Network | Studionet (chain 61999) |
| RPC | `https://studio.genlayer.com/api` |

## Deployment

| Property | Value |
| --- | --- |
| Deployer account | `proofpay-deployer` (`0x42960e62f1a41c61426f133c5e5412dd732f9303`) |
| Deployment tx | `0xe2755d82c829084caac7efa7c056079da2036594c7f925571142a41d20f0deac` |
| Status | **FINALIZED** |
| Consensus | **MAJORITY_AGREE** (5/5 validators AGREE) |
| Execution result | **SUCCESS** |
| Contract state hash | `14d8ce69821357feb0b4c1a5293faab54496171b7cac19c7a8db78ad48af3a07` |
| Contract address | **`0x5CCe24450B88BFC705794830C717c2D511253bF5`** |
| Explorer | https://explorer-studio.genlayer.com/tx/0xe2755d82c829084caac7efa7c056079da2036594c7f925571142a41d20f0deac |

### Post-Deployment Verification

| Check | Result |
| --- | --- |
| `get_contract_version()` | `"2.0.0"` ✓ |
| `get_bounty_count()` | `3` (1 awarded, 1 open/rejected, 1 cancelled) ✓ |
| `get_verdict_count()` | `2` (1 approved, 1 rejected) ✓ |
| Contract schema | 11 methods (6 view, 5 write), `create_bounty` marked `payable: true` ✓ |

## Test Results

### Contract Linter & Validator
```
✓ Lint passed (3 checks)
✓ Validation passed: Contract: ProofPay, Methods: 11 (6 view, 5 write)
```

### Direct Mode Test Suite
```
40 passed in 6.29s
```

### Frontend Tests & Production Build
```
✓ vitest: 10 passed (1 file: src/lib/safety.test.ts)
✓ ESLint: exit code 0 (clean)
✓ Next.js production build: compiled successfully, 10/10 pages
```

## Accounts

| Name | Address | Role |
| --- | --- | --- |
| `proofpay-deployer` | `0x42960e62f1a41c61426f133c5e5412dd732f9303` | Client (bounty creator) |
| `proofpay-builder` | `0x75cb2a9e7ffeea8d52eee43b14a8e460dec7c6d5` | Builder (proof submitter) |

## Live On-Chain Lifecycle Execution

All core lifecycle scenarios have been executed live and finalized by validator consensus on GenLayer Studionet (Chain 61999):

---

### Lifecycle Case 1: Full Approval & Settlement (Bounty #1)

> **Status:** **FINALIZED · APPROVED · ESCROW SETTLED**

1. **Bounty #1 Created & Funded:**
   - Client: `0xfb73b3b3c379a8ec184959f114d19481b891d54e`
   - Reward: 1.0 GEN
   - Title: `ProofPay v2 Production Integration Verification`
   - Criteria: 3 criteria (README architecture, genlayer client initialization, public HTTPS availability)
2. **Proof #1 Submitted:**
   - Builder: `0xc7abf9eac058bb58973f97316ac4b7ab35ed3a53`
   - Canonical commit: `https://github.com/9ytshade/proofpay/commit/e83e87d2d8f92987b7008a213ebca76ab133c8c2`
   - Evidence manifest: `README.md`, `web/src/lib/genlayer.ts`
   - Deployment URL: `https://proofpay-gamma.vercel.app/`
3. **Adjudication Consensus:**
   - GenLayer validators fetched pinned raw source from GitHub and verified live deployment.
4. **Verdict #1 On-Chain:**
   ```json
   {
     "id": 1,
     "bounty_id": 1,
     "submission_id": 1,
     "approved": true,
     "required_criteria_passed": true,
     "outcome": "APPROVED",
     "score": 100,
     "criteria_results": "PASS|PASS|PASS",
     "criteria_report": "1. PASS - The repository README specifies ProofPay v2 architecture\n2. PASS - The codebase contains genlayer client initialization code\n3. PASS - The application loads over public HTTPS without errors",
     "reason": "All required acceptance criteria passed."
   }
   ```
5. **Settlement:**
   - 100% PASS → `APPROVED`
   - Reward transferred to builder.
   - Bounty status transitioned to `awarded`.
6. **Balance Invariant & Delta Verification:**
   | Entity | Pre-Adjudication | Post-Adjudication | Net Delta | Verification Note |
   | --- | --- | --- | --- | --- |
   | **Client** (`0xfb73b3...`) | Escrow funded (-1.0 GEN) | Unchanged | 0.0 GEN | Escrow committed at bounty creation |
   | **Builder** (`0xc7abf9...`) | Pre-payout balance | Pre-payout + 1.0 GEN | **+1.0 GEN** | Reward paid immediately on approval |
   | **Contract Escrow** (`0x5CCe24...`) | 1.0 GEN (Bounty #1) | 0.0 GEN (Bounty #1) | **-1.0 GEN** | Total contract balance decrements by exactly bounty reward |

---

### Lifecycle Case 2: Negative Rejection with Deliberately Insufficient Evidence (Bounty #2)

> **Status:** **FINALIZED · REJECTED · BOUNTY REMAINS OPEN · NO PAYOUT**

1. **Bounty #2 Created & Funded:**
   - Client: `0x42960e62f1a41c61426f133c5e5412dd732f9303`
   - Reward: 0.01 GEN
   - Title: `ProofPay Negative Verification Case`
   - Acceptance criteria requiring deliberately absent files:
     - `The repository must contain a file named contracts/nonexistent_verification_file.py`
     - `The file must export a constant named STRICT_AUDIT_PASS_TOKEN`
   - Creation Tx: `0x49b4de92e058b780cea5f3b5d2924fb4be9df47f315a5535e694d44f25fee6f0` (FINALIZED)
2. **Proof Submitted (Insufficient Evidence):**
   - Builder: `0xb0ECA97C7E1BF50c66E15de81EEeE841CE1fE48b`
   - Canonical commit: `https://github.com/9ytshade/proofpay/commit/e83e87d2d8f92987b7008a213ebca76ab133c8c2`
   - Evidence manifest: `README.md` (lacks the non-existent file/constant)
   - Submission Tx: `0xf873ad4fad1e11c269a9d5545b697b1068ee6d9d83a35ad9cd809ef071aa44cb` (FINALIZED)
3. **Adjudication Consensus:**
   - Adjudication Tx: `0x909999451144d9e15916a950975745888852316a2a34c9f5c7c894004e297e77` (FINALIZED)
4. **Verdict #2 On-Chain:**
   ```json
   {
     "id": 2,
     "bounty_id": 2,
     "submission_id": 1,
     "approved": false,
     "required_criteria_passed": false,
     "outcome": "REJECTED",
     "score": 0,
     "criteria_results": "FAIL|FAIL",
     "criteria_report": "1. FAIL - The repository must contain a file named contracts/nonexistent_verification_file.py\n2. FAIL - The file must export a constant named STRICT_AUDIT_PASS_TOKEN",
     "reason": "One or more required acceptance criteria failed."
   }
   ```
5. **State Invariants Maintained:**
   - Submission status: `rejected`
   - Bounty status: `open`
   - Escrow remains intact, zero payout emitted.
6. **Balance Invariant & Delta Verification:**
   | Entity | Pre-Adjudication | Post-Adjudication | Net Delta | Verification Note |
   | --- | --- | --- | --- | --- |
   | **Client** (`0x42960e...`) | Escrow funded (-0.01 GEN) | Unchanged | 0.0 GEN | Escrow preserved in contract |
   | **Builder** (`0xb0ECA9...`) | Unchanged | Unchanged | 0.0 GEN | No payout on rejected submission |
   | **Contract Escrow** (`0x5CCe24...`) | 0.01 GEN (Bounty #2) | 0.01 GEN (Bounty #2) | **0.0 GEN** | Escrow remains locked for future valid submissions |

---

### Lifecycle Case 3: On-Chain Cancellation & Escrow Refund (Bounty #3)

> **Status:** **FINALIZED · CANCELLED · REFUNDED TO CLIENT**

1. **Bounty #3 Created:**
   - Client: `0x42960e62f1a41c61426f133c5e5412dd732f9303`
   - Reward: 0.01 GEN
   - Submissions: 0
   - Creation Tx: `0xa6c533f59bc71a890bd3dbd06c41253f859a5532d638d5975d9a1f5f0ecce178` (FINALIZED)
2. **Cancellation by Client:**
   - Client invoked `cancel_bounty(bounty_id=3)`
   - Cancellation Tx: `0xa4c7793087e32d55c3e2d3a2b4abba26b731d55218008fef0b6a1000a91c4a19` (FINALIZED)
3. **State Invariants Maintained:**
   - Bounty status: `cancelled`
   - Escrowed reward refunded to client address `0x42960e62f1a41c61426f133c5e5412dd732f9303`.
4. **Balance Invariant & Delta Verification:**
   | Entity | Pre-Cancellation | Post-Cancellation | Net Delta | Verification Note |
   | --- | --- | --- | --- | --- |
   | **Client** (`0x42960e...`) | Pre-refund balance | Pre-refund + 0.01 GEN | **+0.01 GEN** | Full escrow returned to creator |
   | **Builder** (None) | N/A | N/A | 0.0 GEN | 0 submissions existed |
   | **Contract Escrow** (`0x5CCe24...`) | 0.01 GEN (Bounty #3) | 0.0 GEN (Bounty #3) | **-0.01 GEN** | Escrow zeroed out, bounty cancelled |

---

## Production Frontend Verification

| Component | Status | Details |
| --- | --- | --- |
| Production URL | Accessible | https://proofpay-gamma.vercel.app/ |
| HTTP Status | 200 OK | Verified via HTTP GET |
| Target Contract | Verified v2 | Bundles target `0x5CCe24450B88BFC705794830C717c2D511253bF5` (0 references to legacy v1) |
| On-Chain Compatibility | Compatible | Verified `get_contract_version() == "2.0.0"` via `genlayer-js` |

## Historical Reference

The prior v1 contract at `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` on Studionet (chain 61999) is retained in documentation for historical reference only.

## Known Limitations

1. **CLI payable writes:** GenLayer CLI 0.39.1 `write` does not support `--value`, so payable methods (`create_bounty`) cannot be called directly from the CLI command line. Use the web frontend with MetaMask or SDK scripts passing `{ value }`.
