# ProofPay

ProofPay is an AI-native escrow marketplace for public software bounties.
Clients fund work in GEN, builders submit public proof of completion, and a
GenLayer Intelligent Contract adjudicates the evidence against the bounty's
plain-language requirements.

## MVP focus

The first release supports public web-development bounties with a GitHub
repository and a deployed HTTPS application as proof. It is deliberately not a
general freelance marketplace: private evidence, fiat payments, teams, and
reputation are outside the MVP.

### Winner policy

Each MVP bounty has one reward and one winner. Multiple builders may submit
evidence while a bounty is open, but the first submission to receive a
finalized approved GenLayer verdict receives the full escrowed reward. The
bounty then becomes `awarded`, so later submissions cannot be paid even if
their work would also meet the criteria.

This makes the MVP a transparent **first verified winner** marketplace. A
post-MVP contract upgrade will introduce creator-selectable payout models,
including best submission after the deadline, shared rewards for all approved
submissions, and multiple winner slots.

## Build phases

1. Foundation and protocol specification
2. Core multi-bounty escrow contract
3. Intelligent evidence adjudication
4. GenLayer network and fee integration
5. Wallet-connected web application
6. Security hardening and end-to-end demo

The authoritative MVP and contract specifications are in `docs/`.

