# ProofPay v2 contract specification

## Contract version

`2.0.0` — returned by `get_contract_version()`.

## Invariants

1. Every bounty reward is funded exactly once at creation.
2. A reward is paid at most once, and only to its approved builder.
3. Only the bounty client can cancel an open bounty with no submissions.
4. A client cannot submit to their own bounty.
5. A submission cannot be created after the bounty deadline.
6. A bounty cannot be cancelled after any submission has been recorded.
7. A refund cannot coexist with a payout.
8. A rejected verdict leaves the reward escrowed and the bounty open.
9. Approved settlement occurs only after GenLayer transaction finality.
10. Bounty and submission records are append-only; outcome history stays public.

## Storage schema

### Bounty

| Field | Type | Meaning |
| --- | --- | --- |
| `client` | `Address` | Account that created and funded the bounty. |
| `title` | `str` | Human-readable title (3–120 chars). |
| `brief` | `str` | Description of the requested work (20–10,000 chars). |
| `criteria` | `str` | Newline-delimited acceptance criteria (1–5 items, each ≤ 600 chars). |
| `reward` | `u256` | Native GEN escrowed for a single approved submission. |
| `deadline` | `u64` | Unix timestamp — last time at which a submission is valid. |
| `status` | `str` | `open`, `awarded`, `cancelled`, or `refunded`. |
| `submission_count` | `u32` | Number of submissions recorded. |
| `approved_submission_id` | `u32` | Winning submission ID (0 if none). |

### Submission

| Field | Type | Meaning |
| --- | --- | --- |
| `builder` | `Address` | Account that submitted the proof. |
| `repository_url` | `str` | Canonical GitHub commit URL (`https://github.com/{owner}/{repo}/commit/{sha}`). |
| `repository_owner` | `str` | Parsed GitHub owner. |
| `repository_name` | `str` | Parsed GitHub repository name. |
| `commit_sha` | `str` | Immutable 40-char lowercase hex commit SHA. |
| `evidence_paths` | `str` | Newline-delimited list of source file paths (1–6 paths, each ≤ 240 chars). |
| `deployment_url` | `str` | Public HTTPS deployment URL. |
| `summary` | `str` | Builder's concise explanation (10–3,000 chars). |
| `status` | `str` | `submitted`, `approved`, or `rejected`. |
| `score` | `u8` | Derived percentage score (0–100). |
| `reason` | `str` | Human-readable outcome reason. |
| `verdict_id` | `u32` | Most recent verdict ID (0 if none). |
| `review_count` | `u32` | Number of times this submission has been adjudicated. |
| `last_outcome` | `str` | Most recent verdict outcome (`APPROVED`, `REJECTED`, `UNDETERMINED`, or empty). |

### Verdict

| Field | Type | Meaning |
| --- | --- | --- |
| `bounty_id` | `u256` | Bounty this verdict belongs to. |
| `submission_id` | `u32` | Submission this verdict belongs to. |
| `approved` | `bool` | Whether the submission was approved. |
| `required_criteria_passed` | `bool` | Whether all required criteria passed. |
| `outcome` | `str` | `APPROVED`, `REJECTED`, or `UNDETERMINED`. |
| `score` | `u8` | Derived percentage score. |
| `criteria_results` | `str` | Pipe-separated per-criterion results (`PASS|FAIL|UNDETERMINED`). |
| `criteria_report` | `str` | Per-criterion narrative report. |
| `reason` | `str` | Concise outcome reason. |
| `evidence_note` | `str` | Validator note about evidence accessibility. |

## Public methods

### Write methods (5)

| Method | Caller | Parameters | Preconditions | Outcome |
| --- | --- | --- | --- | --- |
| `create_bounty` | Client | `title`, `brief`, `criteria`, `deadline` | Positive `msg.value`, valid brief/criteria, future deadline | Creates and funds an open bounty. Returns `bounty_id`. |
| `submit_proof` | Builder | `bounty_id`, `repository_url`, `deployment_url`, `summary`, `evidence_paths` | Open bounty, before deadline, builder ≠ client, valid GitHub commit URL, valid evidence manifest | Stores a pending submission with immutable commit identity. Returns `submission_id`. |
| `adjudicate_submission` | Anyone | `bounty_id`, `submission_id` | Open bounty, submission status is `submitted` | Runs validator consensus and records verdict. Returns verdict dict. |
| `cancel_bounty` | Client | `bounty_id` | Open bounty, zero submissions | Refunds the client via external message. |
| `refund_expired_bounty` | Client | `bounty_id` | Open bounty, review window has elapsed | Refunds the client via external message. |

### View methods (6)

| Method | Parameters | Returns |
| --- | --- | --- |
| `get_contract_version` | *(none)* | `"2.0.0"` |
| `get_bounty_count` | *(none)* | Total number of bounties created. |
| `get_verdict_count` | *(none)* | Total number of verdicts recorded. |
| `get_bounty` | `bounty_id` | Full bounty record as dict. |
| `get_submission` | `bounty_id`, `submission_id` | Full submission record as dict. |
| `get_verdict` | `verdict_id` | Full verdict record as dict. |

## Evidence model

### Immutable GitHub commit identity

The `repository_url` must be a GitHub commit URL in the form:

```
https://github.com/{owner}/{repo}/commit/{40-char-hex-sha}
```

The contract parses the owner, repository name, and commit SHA from this URL.
The commit SHA is immutable — validators fetch source files from
`raw.githubusercontent.com/{owner}/{repo}/{sha}/{path}` using the bounded
evidence paths.

### Bounded evidence paths

The `evidence_paths` field is a newline-delimited list of 1–6 relative file
paths within the repository. Each path must:

- be at most 240 chars
- not contain `..`, backslash, or null bytes
- have an allowed file extension matching the contract's supported text files:
  `.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.md`, `.txt`,
  `.html`, `.css`, `.scss`, `.sass`, `.less`, `.yaml`, `.yml`, `.toml`, `.sol`,
  `.rs`, `.go`, `.java`, `.kt`, `.sh`, `.ps1`, `.sql`, `.vue`, `.svelte`

Validators fetch only these specific files from the pinned commit via `raw.githubusercontent.com` — not the
repository tree, not the interactive GitHub commit page.

### Evidence accessibility and precheck rules

Validators perform HTTP prechecks on both source files and the live deployment:
- **HTTP 404 / 410 / Empty file:** Permanent failure &rarr; evaluated as `FAIL` across criteria, leading to a `REJECTED` verdict (escrow remains safe, bounty stays open).
- **HTTP 429 / 5xx:** Transient failure &rarr; evaluated as `UNDETERMINED` across criteria, keeping the submission in `submitted` status so it can be retried without penalizing the builder.

### Mutable deployment evidence

The `deployment_url` is a public HTTPS URL pointing to the live deployment.
Unlike the commit SHA, the deployment URL content may change between reviews.
Validators fetch and assess the deployment at adjudication time.

## Decision policy

### Criterion-level assessment

Each acceptance criterion receives one of three results from validator
consensus:

| Result | Meaning |
| --- | --- |
| `PASS` | The criterion is satisfied by the evidence. |
| `FAIL` | The criterion is not satisfied. |
| `UNDETERMINED` | The evidence is insufficient to determine the criterion. |

### Deterministic outcome rule

```
if all criteria are PASS         → APPROVED
if any criterion is FAIL         → REJECTED
if any criterion is UNDETERMINED → UNDETERMINED (and none FAIL)
```

- **100% of criteria must PASS** for approval. There is no weighted score
  threshold or partial approval.
- The `score` field is a derived percentage (PASS count / total × 100) for
  display purposes only — it does not influence the outcome.

### Application-level UNDETERMINED

An `UNDETERMINED` verdict means the contract recorded the result on-chain, but
the submission remains in `submitted` status. The adjudication can be retried —
the submission is not locked or consumed.

This is distinct from a *network-level* failure (transaction revert / timeout),
where no on-chain state change occurs at all.

### Seven-day review window

After the bounty deadline passes, the bounty remains reviewable for 7 days
(`REVIEW_WINDOW_SECONDS = 604800`). After the review window closes, the client
may call `refund_expired_bounty` to recover the escrowed reward.

## Settlement and finality

An approval sets the submission status to `approved`, the bounty status to
`awarded`, and transfers the escrowed reward to the builder via
`_Recipient(builder).emit_transfer(value=reward)`. This uses GenLayer's
finality-safe external message mechanism.

A failed or undetermined adjudication leaves the reward escrowed and the bounty
open.

## Legacy contract

The prior v1 contract at `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` on
Studionet (chain 61999) is historical reference only and is not compatible with
the v2 frontend or adjudication logic.

## Validation limits

| Constant | Value |
| --- | --- |
| `MAX_TITLE_LENGTH` | 120 |
| `MAX_BRIEF_LENGTH` | 10,000 |
| `MAX_CRITERIA_LENGTH` | 3,000 |
| `MAX_CRITERION_LENGTH` | 600 |
| `MAX_CRITERIA_COUNT` | 5 |
| `MAX_URL_LENGTH` | 2,048 |
| `MAX_SUMMARY_LENGTH` | 3,000 |
| `MAX_EVIDENCE_PATHS` | 6 |
| `MAX_EVIDENCE_PATH_LENGTH` | 240 |
| `MAX_EVIDENCE_PATHS_LENGTH` | 1,500 |
| `MAX_SOURCE_CHARS_PER_FILE` | 12,000 |
| `MAX_SOURCE_CHARS_TOTAL` | 42,000 |
| `MAX_DEPLOYMENT_CHARS` | 20,000 |
