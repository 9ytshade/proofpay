# ProofPay contract specification

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

## Public methods for Phase 2

| Method | Caller | Preconditions | Outcome |
| --- | --- | --- | --- |
| `create_bounty` | Client | Positive value, valid brief/criteria, future deadline | Creates and funds an open bounty. |
| `get_bounty` | Anyone | Valid id | Returns bounty data. |
| `list_bounty_submissions` | Anyone | Valid id | Returns submission ids/history. |
| `submit_proof` | Builder | Open bounty, before deadline, builder != client, valid public URL shapes | Stores a pending submission. |
| `cancel_bounty` | Client | Open bounty, zero submissions | Refunds the client. |
| `refund_expired_bounty` | Client | Unpaid, review window elapsed | Refunds the client. |

## Public methods for Phase 3

| Method | Caller | Preconditions | Outcome |
| --- | --- | --- | --- |
| `adjudicate_submission` | Anyone | Pending submission and open bounty | Runs validator consensus and records verdict. |
| `get_verdict` | Anyone | Valid id | Returns structured verdict. |
| `appeal` | Eligible party | Finalized adjudication and valid protocol charge | Initiates protocol appeal using the quoted charge. |

## Evidence validation before adjudication

- Repository URL must be an HTTPS GitHub repository URL.
- Deployment URL must be HTTPS and contain a host.
- URLs, brief, criteria, and summary have conservative length caps.
- No credentials, query secrets, or non-public schemes are accepted.
- The contract does not infer a payment recipient from any URL content.

## Events/history exposed to the UI

- `BountyCreated`
- `ProofSubmitted`
- `AdjudicationStarted`
- `VerdictRecorded`
- `BountyPaid`
- `BountyCancelled`
- `BountyRefunded`

## Settlement rule

An approval updates the selected submission and locks the bounty against all
other state-changing actions. The reward transfer is scheduled only through
the GenLayer-supported finality-safe mechanism. A failed or undetermined
adjudication must leave the reward locked and give no account a payout.

