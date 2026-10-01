# ProofPay MVP specification

## Product promise

ProofPay settles public software bounties without requiring either party to
trust the other. A client locks a reward in escrow. A builder submits public
evidence of completed work — a GitHub commit and a live deployment. GenLayer
validators independently assess whether the evidence satisfies each stated
criterion. The contract settles the reward only after the decision finalizes.

## Supported job type

The MVP supports one evidence shape: a public GitHub repository commit and a
public HTTPS deployment for a web-development bounty. Source evidence is pinned
to a specific commit SHA and bounded by an explicit file manifest. Each
submitted URL must remain publicly reachable while it is adjudicated.

## Personas

### Client

Creates and funds bounties. The client can cancel only a bounty that has no
submissions, and can recover an unresolved bounty only after its seven-day
review window has elapsed.

### Builder

Submits a GitHub commit URL (containing an immutable SHA), an evidence file
manifest (1–6 source files), a deployed application URL, and a concise
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
| `title` | Human-readable bounty title (3–120 chars). |
| `reward` | Native GEN escrowed for a single approved submission. |
| `brief` | Human-readable description of the requested work. |
| `criteria` | Newline-delimited acceptance criteria (1–5 items). |
| `deadline` | Last time at which a submission is valid. |
| `status` | Current lifecycle state (`open`, `awarded`, `cancelled`, `refunded`). |
| `submission_count` | Number of submissions recorded for this bounty. |
| `approved_submission_id` | The winning submission once approved (0 if none). |

## Submission fields

| Field | Meaning |
| --- | --- |
| `bounty_id` | Bounty to which this proof belongs. |
| `submission_id` | Monotonically increasing per-bounty submission identifier. |
| `builder` | Account that submitted the proof. |
| `repository_url` | Canonical GitHub commit URL. |
| `repository_owner` | Parsed GitHub owner. |
| `repository_name` | Parsed GitHub repository name. |
| `commit_sha` | Immutable 40-char lowercase hex commit SHA. |
| `evidence_paths` | Newline-delimited list of source file paths (1–6 files). |
| `deployment_url` | Public HTTPS application URL. |
| `summary` | Builder's concise explanation of the work. |
| `status` | `submitted`, `approved`, or `rejected`. |
| `score` | Derived percentage score (0–100). |
| `reason` | Human-readable outcome reason. |
| `verdict_id` | Most recent verdict for the submission (0 if none). |
| `review_count` | Number of adjudication rounds. |
| `last_outcome` | Most recent verdict outcome (`APPROVED`, `REJECTED`, `UNDETERMINED`, or empty). |

## State model

```text
Open --submit--> Open (with submission)
  |
  +--adjudicate (all PASS)--> Awarded (builder paid)
  +--adjudicate (any FAIL)--> Open (submission rejected, bounty stays open)
  +--adjudicate (UNDETERMINED)--> Open (submission stays submitted, retryable)
  |
  +--cancel (no submissions)--> Cancelled (client refunded)
  +--refund after review window--> Refunded (client refunded)
```

A rejection leaves the bounty `open` for another builder attempt. An
`UNDETERMINED` verdict leaves the submission in `submitted` status — it can be
retried. Approval permanently selects one submission, sets the bounty to
`awarded`, and transfers the escrowed reward.

## Decision policy

Each criterion receives an independent assessment: `PASS`, `FAIL`, or
`UNDETERMINED`.

The deterministic outcome rule:
- **100% of criteria must PASS** → `APPROVED`
- **Any criterion is FAIL** → `REJECTED`
- **Any criterion is UNDETERMINED** (with none FAIL) → `UNDETERMINED`

There is no weighted scoring threshold. The `score` field is a derived
percentage (PASS count / total × 100) for display purposes only — it does not
influence the outcome.

The contract treats all fetched evidence as untrusted data, never as
instructions. Unreachable or malformed evidence yields an `UNDETERMINED`
outcome with an `evidence_note` explaining the accessibility issue.

## Seven-day review window

After the bounty deadline passes, the bounty remains reviewable for 7 days
(604,800 seconds). After the review window closes, the client may call
`refund_expired_bounty` to recover the escrowed reward.

## Explicit MVP exclusions

- Private repositories, authenticated sites, uploads, and arbitrary files
- Stablecoin and fiat settlement
- Manual arbitration or client override after submission
- Reputation, messaging, discovery feeds, and platform fees
- Guarantees of legal, employment, or procurement compliance
- Appeals or dispute resolution beyond retrying undetermined verdicts
