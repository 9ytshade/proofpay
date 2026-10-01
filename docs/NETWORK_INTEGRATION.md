# Network integration — archived preview material

> **Status:** This document describes the v0.6 release-candidate / Studio-dev
> preview configuration that was used for early validation. It is **not** the
> live deployment path for ProofPay v2 on Studionet (chain 61999).

## Live deployment target

ProofPay v2 deploys to **GenLayer Studionet (chain 61999)** using the stable
toolchain:

| Component | Version |
| --- | --- |
| GenLayer CLI | 0.39.1 (repository-local via npm) |
| `genlayer-py` | 0.16.3 |
| `genlayer-test` | 0.29.2 |
| `genvm-linter` | 0.7.1 |
| RPC | `https://studio.genlayer.com/api` |

See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for the current deployment
procedure.

---

## Archived: v0.6 RC preview configuration

The following section is retained for historical reference only. Do not use
these versions for the live 61999 deployment.

| Component | Preview pin |
| --- | --- |
| `genlayer-py` | `0.19.0rc2` |
| `genlayer-test` | `0.30.0rc2` |
| `genvm-linter` | `0.11.1rc2` |
| GenLayer CLI | `0.40.0-rc.3` |

### Preview environments

| Environment | Chain ID | Use |
| --- | ---: | --- |
| Localnet | 61127 | Fast tests and fee profiling. |
| Studionet | 61999 | Stable hosted development. |
| Studio-dev | 61997 | v0.6 preview validation only; resets expected. |

### Fee-profile workflow (preview only)

The fee-profile workflow described below applies only to the RC preview
environment and is not required for the current Studionet deployment.

1. Run representative contract tests on a fee-reporting local environment.
2. Generate `fee-profile.json` with the matching `gltest --fee-profile` flow.
3. Include every cost-relevant branch.
4. Check the generated file into the repository after review.
5. Use the SDK/CLI to produce a live estimate at submission time.
