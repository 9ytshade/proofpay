# ProofPay MVP specification

## Product promise

ProofPay settles public software bounties without requiring either party to
trust the other. A client locks a reward in escrow. A builder submits public
evidence of completed work. GenLayer validators independently assess whether
the evidence satisfies the stated requirements. The contract settles the
reward only after the decision finalizes.

## Supported job type

The MVP supports one evidence shape: a public GitHub repository and a public
HTTPS deployment for a web-development bounty. Each submitted URL must remain
publicly reachable while it is adjudicated.

## Personas

### Client

Creates and funds bounties. The client can cancel only a bounty that has no
submissions, and can recover an unresolved bounty only after its review window
has elapsed.

### Builder

Submits a GitHub repository, a deployed application URL, and a concise
explanation. Multiple builders can submit to one bounty. A rejected builder
may submit another attempt before the deadline while the bounty remains open.

### Viewer

May inspect the public bounty brief, public proof links, decision history, and
settlement status.

## Bounty fields

| Field | Meaning |
| --- | --- |
| `id` | Monotonically increasing bounty identifier. |
| `client` | Account that created and funded the bounty. |
| `reward` | Native GEN escrowed for a single approved submission. |
| `brief` | Human-readable description of the requested work. |
| `criteria` | Up to five explicit acceptance criteria. |
| `deadline` | Last time at which a submission is valid. |
| `review_window` | Time after deadline in which an unresolved bounty remains reviewable. |
| `state` | Current lifecycle state. |
| `approved_submission_id` | The winning submission once approved. |

## Submission fields

| Field | Meaning |
| --- | --- |
| `id` | Monotonically increasing submission identifier. |
| `bounty_id` | Bounty to which this proof belongs. |
| `builder` | Account that submitted the proof. |
| `repository_url` | Public GitHub repository URL. |
| `deployment_url` | Public HTTPS application URL. |
| `summary` | Builder's concise explanation of the work. |
| `state` | Submitted, rejected, approved, or withdrawn in a future release. |
| `verdict_id` | Most recent verdict for the submission, if any. |

## State model

```text
Open --submit--> UnderReview --reject--> Open
  |                  |                      ^
  |                  +--approve--> Finalizing --finality--> Paid
  |
  +--cancel (no submissions)--> Refunded
  +--refund after review window--> Refunded
```

`UnderReview` is a transient, exclusive lock for the submission currently
being adjudicated. A rejection returns the bounty to `Open`; it does not block
other submissions. Approval permanently selects one submission and prevents
all further submissions or cancellation.

## Decision policy

Each criterion has a required flag and a weight. The MVP approves a
submission only when every required criterion passes and the weighted score is
at least 80 out of 100. The verdict must include a criterion-by-criterion
result, total score, concise rationale, and a decision.

The contract treats all fetched evidence as untrusted data, never as
instructions. A malformed or unavailable URL yields a rejection, not a
contract failure or payment.

## Explicit MVP exclusions

- Private repositories, authenticated sites, uploads, and arbitrary files
- Stablecoin and fiat settlement
- Manual arbitration or client override after submission
- Reputation, messaging, discovery feeds, and platform fees
- Guarantees of legal, employment, or procurement compliance

