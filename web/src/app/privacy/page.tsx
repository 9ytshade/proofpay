import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & Ledger Transparency · ProofPay",
  description: "Explanation of public blockchain immutability and client-side data storage in ProofPay.",
};

export default function PrivacyPage() {
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
          Privacy &amp; Ledger Transparency
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          Last Updated: October 2, 2026 &bull; Protocol Version 2.0.0
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--ink)]">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            1. Public Blockchain Ledger
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            ProofPay operates on the GenLayer public blockchain. All transactions sent to the intelligent contract are permanently,
            publicly, and immutably recorded on-chain.
          </p>
          <div className="mt-4 rounded border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            <strong>Notice:</strong> Once published, on-chain records cannot be edited, modified, or removed by anyone. Never include
            confidential passwords, private keys, or personal identifiable information (PII) in bounty briefs or proof submissions.
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            2. Local Browser Storage
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            ProofPay uses browser <code className="rounded bg-[var(--paper)] px-1 py-0.5 font-mono text-xs">localStorage</code> exclusively
            to enhance local user experience:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[var(--muted-ink)]">
            <li><strong>Active Transaction Restoration:</strong> In-progress transactions are saved locally so you do not lose state if the page refreshes.</li>
            <li><strong>Theme Preference:</strong> Remembers your light or dark mode selection.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            3. Zero Tracking &amp; Zero Advertising
          </h2>
          <p className="mt-2 text-[var(--muted-ink)]">
            ProofPay does not use advertising trackers, third-party analytics pixels, or device fingerprinting. We do not sell, rent, or monetize
            user information.
          </p>
        </section>
      </div>
    </main>
  );
}
