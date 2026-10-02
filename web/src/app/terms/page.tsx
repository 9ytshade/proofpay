import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use · ProofPay",
  description: "Terms governing bounty creation, submission, adjudication, and finality on ProofPay.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <div className="mb-8">
        <Link
          href="/"
          className="font-mono text-xs text-[var(--muted-ink)] hover:text-[var(--ink)]"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          Last Updated: October 2, 2026 &bull; Protocol Version 2.0.0
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--ink)]">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            1. Nature of the Protocol
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            ProofPay is a decentralized, non-custodial software application operating on the GenLayer blockchain.
            Bounties, submissions, evaluations, and escrow payouts are executed autonomously by GenVM intelligent contracts
            via multi-validator consensus.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[var(--muted-ink)]">
            <li><strong>No Human Intermediary:</strong> No central administrator or escrow agent manages funds.</li>
            <li><strong>No Manual Appeal:</strong> Consensus verdicts are final on-chain without human arbitration.</li>
            <li><strong>Autonomous Settlement:</strong> Approved claims release escrow funds immediately to the builder.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            2. Bounty Creation &amp; Client Escrow
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            When you create a bounty, the full reward amount in GEN is irrevocably locked in the intelligent contract.
            Funds are released to the builder upon consensus approval, refunded upon client cancellation (if 0 submissions exist),
            or refunded if the bounty expires past the review grace window without an approved claim.
          </p>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            3. Builder Proof Submission &amp; Finality
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            Builders must submit valid GitHub commit URLs (40-char SHA), accurate relative file manifests, and valid live deployment URLs.
            Bounties remain open to all builders until an approved claim is reached. The first submission to achieve consensus approval
            receives the reward, locking out subsequent submissions.
          </p>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            4. Token Utility &amp; Financial Disclosures
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            All transactions on GenLayer Studionet (Chain ID 61999) or Testnet use experimental test tokens with zero monetary value.
            ProofPay is not a bank, broker, or financial institution.
          </p>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            5. Disclaimer of Warranties
          </h2>
          <p className="mt-2 text-xs text-[var(--muted-ink)]">
            THE PROTOCOL IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. UNDER NO CIRCUMSTANCES
            SHALL THE DEVELOPERS OR CONTRIBUTORS BE LIABLE FOR ANY LOSS OF FUNDS, HARDWARE ISSUES, OR CONSENSUS CONVERGENCE FAILURES.
          </p>
        </section>
      </div>
    </main>
  );
}
