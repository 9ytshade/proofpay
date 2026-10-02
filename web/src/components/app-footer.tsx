import Link from "next/link";
import { PROOFPAY_NETWORK, proofPayContractAddress } from "@/lib/genlayer";

export function AppFooter() {
  const shortContract = `${proofPayContractAddress.slice(0, 6)}...${proofPayContractAddress.slice(-4)}`;

  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--paper)] py-8 text-xs text-[var(--muted-ink)]">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--ink)]">ProofPay</span>
              <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--signal)]">
                v2.0.0
              </span>
              <span>&bull;</span>
              <span>{PROOFPAY_NETWORK.name} ({PROOFPAY_NETWORK.id})</span>
            </div>
            <p className="max-w-xl text-[11px] leading-relaxed text-[var(--muted-ink)]">
              Intelligent escrow protocol on GenLayer. Payouts are evaluated autonomously by validator AI consensus.
              Testnet/Studionet tokens hold no monetary value.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px]">
            <Link href="/terms" className="transition hover:text-[var(--ink)]">
              Terms of Use
            </Link>
            <Link href="/privacy" className="transition hover:text-[var(--ink)]">
              Privacy &amp; Ledger
            </Link>
            <Link href="/protocol" className="transition hover:text-[var(--ink)]">
              Protocol Specs
            </Link>
            <a
              href={`https://explorer-studio.genlayer.com/address/${proofPayContractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--ink)]"
            >
              Contract: {shortContract} &nearr;
            </a>
            <a
              href="https://github.com/9ytshade/proofpay"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--ink)]"
            >
              GitHub &nearr;
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
