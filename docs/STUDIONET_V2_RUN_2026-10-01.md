# ProofPay v2 Studionet Deployment Record — 2026-10-01

## Repository

| Item | Value |
| --- | --- |
| Starting commit | `e83e87d2d8f92987b7008a213ebca76ab133c8c2` |
| Branch | `proofpay-v2-hardening` |
| Final commit | `bb7f08299ae9123f7e72db1fb1c6000b1ee51b37` |
| Repository | https://github.com/9ytshade/proofpay |

## Contract source

| Item | Value |
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

| Item | Value |
| --- | --- |
| Deployer account | `proofpay-deployer` (`0x42960e62f1a41c61426f133c5e5412dd732f9303`) |
| Deployment tx | `0xe2755d82c829084caac7efa7c056079da2036594c7f925571142a41d20f0deac` |
| Status | **FINALIZED** |
| Consensus | **MAJORITY_AGREE** (5/5 validators AGREE) |
| Execution result | **SUCCESS** |
| Contract state hash | `14d8ce69821357feb0b4c1a5293faab54496171b7cac19c7a8db78ad48af3a07` |
| New contract address | **`0x5CCe24450B88BFC705794830C717c2D511253bF5`** |
| Explorer | https://explorer-studio.genlayer.com/tx/0xe2755d82c829084caac7efa7c056079da2036594c7f925571142a41d20f0deac |

### Post-deployment verification

| Check | Result |
| --- | --- |
| `get_contract_version()` | `"2.0.0"` ✓ |
| `get_bounty_count()` | `0` ✓ |
| `get_verdict_count()` | `0` ✓ |
| Contract schema | 11 methods (6 view, 5 write), `create_bounty` marked `payable: true` ✓ |

## Test results

### Contract linter

```
✓ Lint passed (3 checks)
✓ Validation passed: Contract: ProofPay, Methods: 11 (6 view, 5 write)
```

### Direct Mode test suite

```
40 passed in 6.29s
```

### Frontend tests

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

## Live lifecycle test

> **Status:** **VERIFIED ON-CHAIN (FULL APPROVAL LIFECYCLE)**

The complete end-to-end approval lifecycle has been executed and verified live on GenLayer Studionet (Chain 61999) using the web frontend and MetaMask:

### Lifecycle execution facts

1. **Bounty #1 Created:**
   - Client funded the escrow reward on-chain
   - Title: `ProofPay v2 Production Integration Verification`
   - Acceptance criteria: 3 independent criteria requiring README architecture verification, genlayer client initialization, and public HTTPS availability.

2. **Proof #1 Submitted:**
   - Builder account submitted public proof with immutable commit identity:
     - Canonical commit: `https://github.com/9ytshade/proofpay/commit/e83e87d2d8f92987b7008a213ebca76ab133c8c2`
     - Evidence manifest paths: `README.md` and `web/src/lib/genlayer.ts`
     - Deployment URL: `https://proofpay-gamma.vercel.app/`

3. **Intelligent Consensus Adjudication:**
   - GenLayer validators fetched the pinned source files from `raw.githubusercontent.com` and inspected the live deployment.
   - All validators independently verified each criterion.

4. **Verdict #1 Recorded On-Chain:**
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

5. **Settlement and Award:**
   - The contract deterministically derived `APPROVED` (100% of criteria `PASS`).
   - Escrowed reward transferred to the builder account via GenLayer's finality-safe mechanism.
   - Bounty status transitioned to `awarded`.
   - Frontend displays the `APPROVED · REWARD SETTLED` banner and individual criterion chips `[C1: PASS]`, `[C2: PASS]`, `[C3: PASS]`.

## Legacy contract

The prior v1 contract at `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` on
Studionet (chain 61999) is retained in documentation as historical reference
only.

## Frontend configuration

```env
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
NEXT_PUBLIC_PROOFPAY_CONTRACT_ADDRESS=0x5CCe24450B88BFC705794830C717c2D511253bF5
NEXT_PUBLIC_PROOFPAY_DISCOVERY_LIMIT=100
```

Verified on Vercel production: `NEXT_PUBLIC_PROOFPAY_CONTRACT_ADDRESS` is set to `0x5CCe24450B88BFC705794830C717c2D511253bF5`.

## Known limitations

1. **CLI payable writes:** GenLayer CLI 0.39.1 `write` does not support `--value`,
   so payable methods (`create_bounty`) cannot be called from the CLI. Use the
   web frontend with MetaMask instead.
