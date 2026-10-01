import { BountyDesk } from "@/components/bounty-desk";

export default function BountiesPage() {
  return (
    <main className="grain min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-10 sm:px-8 sm:pt-16 lg:px-12">
        <header className="grid gap-7 border-b border-[var(--line)] pb-10 md:grid-cols-12 md:items-end md:pb-14">
          <div className="md:col-span-8">
            <p className="mono mb-5 text-[10px] tracking-[0.13em] text-[var(--signal)]">PROOFPAY / BOUNTY RECORDS</p>
            <h1 className="max-w-4xl text-6xl leading-[0.86] tracking-[-0.07em] sm:text-8xl">Work, in the open.</h1>
          </div>
          <p className="max-w-lg text-base leading-6 text-[var(--muted-ink)] md:col-span-4 md:pb-1">Browse finalized bounty records read directly from the ProofPay contract on Studionet.</p>
        </header>
        <div className="py-8 sm:py-12">
          <BountyDesk mode="all" />
        </div>
        <footer className="mono flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-[10px] tracking-[0.08em] text-[var(--muted-ink)] sm:flex-row sm:items-center sm:justify-between">
          <span>PROOFPAY / CASES SETTLED IN PUBLIC</span>
          <span>STUDIONET · CHAIN 61999</span>
          <span aria-label="Copyright 9ytshade">© 9YTSHADE</span>
        </footer>
      </div>
    </main>
  );
}