import Link from "next/link";
import { BountyDesk } from "@/components/bounty-desk";

export default function Home() {
  return (
    <main className="grain min-h-screen overflow-hidden bg-[var(--paper)]">
      <div className="relative mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <section id="top" className="grid gap-10 py-16 md:grid-cols-12 md:py-24">
          <div className="reveal md:col-span-8">
            <p className="mono mb-6 text-[11px] tracking-[0.13em] text-[var(--signal)]">PUBLIC-WORK ESCROW · BUILT ON GENLAYER</p>
            <h1 className="max-w-4xl text-[clamp(4.2rem,10vw,9.2rem)] leading-[0.82] tracking-[-0.075em] text-[var(--ink)]">Proof first.<br /><span className="italic">Payment</span> next.</h1>
            <p className="mt-8 max-w-xl text-xl leading-7 text-[var(--muted-ink)] sm:text-2xl sm:leading-8">A public bounty desk where builders show their work and GenLayer independently decides whether it earns the reward.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/bounties" className="rounded-full bg-[var(--signal)] px-6 py-3 text-sm text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)]">Explore bounty records</Link>
              <Link href="/bounties/create" className="rounded-full border border-[var(--line)] bg-[var(--card)] px-6 py-3 text-sm transition hover:border-[var(--ink)]">Post a bounty</Link>
              <Link href="/submit" className="rounded-full border border-[var(--line)] bg-[var(--card)] px-6 py-3 text-sm transition hover:border-[var(--ink)]">Submit proof</Link>
              <Link href="/reviews" className="rounded-full border border-[var(--line)] bg-[var(--card)] px-6 py-3 text-sm transition hover:border-[var(--ink)]">Review evidence</Link>
            </div>
          </div>
          <aside className="reveal reveal-delay-2 self-end border-l border-[var(--line)] pl-5 md:col-span-4 md:pl-8">
            <p className="mono text-[10px] tracking-[0.12em] text-[var(--muted-ink)]">THE PROOFPAY STANDARD</p>
            <ol className="mt-6 space-y-5">
              {[["01", "Lock", "Client funds a clear, public brief."], ["02", "Submit", "Builder posts source and live proof."], ["03", "Settle", "Validator consensus assesses the work."]].map(([number, title, copy]) => (
                <li className="grid grid-cols-[30px_1fr] gap-3" key={number}>
                  <span className="mono text-[10px] text-[var(--signal)]">{number}</span>
                  <p className="text-base leading-5"><strong className="font-medium">{title}.</strong> <span className="text-[var(--muted-ink)]">{copy}</span></p>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <BountyDesk mode="featured" />

        <section id="how-it-works" className="grid gap-8 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-4">
            <p className="mono text-[10px] tracking-[0.12em] text-[var(--signal)]">NOT A PROMISE. A PROCESS.</p>
            <h2 className="mt-4 text-5xl leading-[0.9] tracking-[-0.06em] sm:text-6xl">The work speaks for itself.</h2>
          </div>
          <div className="md:col-span-8 md:pt-3">
            <div className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
              <ProcessCard number="A" title="The brief" copy="Every bounty names the outcome, deadline, reward, and acceptance criteria before money moves." />
              <ProcessCard number="B" title="The evidence" copy="Builders submit a public GitHub repository, a live deployment, and a concise handoff." />
              <ProcessCard number="C" title="The verdict" copy="GenLayer validators inspect evidence against the brief and return an explainable scorecard." />
            </div>
          </div>
        </section>

        <section id="why-proofpay" className="relative overflow-hidden rounded-[2rem] bg-[var(--ink)] px-7 py-12 text-[var(--paper)] sm:px-12 md:py-16">
          <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border border-[var(--feature-orbit)]/50" />
          <div className="absolute -right-3 -top-4 h-40 w-40 rounded-full bg-[var(--feature-orbit)] opacity-90" />
          <div className="relative grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="mono text-[10px] tracking-[0.12em] text-[var(--feature-label)]">A NEW KIND OF HANDSHAKE</p>
              <h2 className="mt-4 max-w-2xl text-5xl leading-[0.88] tracking-[-0.06em] sm:text-6xl">No chasing invoices. No judging in private.</h2>
            </div>
            <div className="flex flex-col justify-end md:col-span-5">
              <p className="max-w-sm text-lg leading-6 text-[var(--feature-copy)]">ProofPay turns a public deliverable into a clear settlement path: evidence, consensus, finality.</p>
              <Link href="/protocol" className="mt-7 w-fit rounded-full bg-[var(--feature-accent)] px-5 py-3 text-sm font-medium text-[var(--feature-accent-ink)] transition hover:scale-[1.02]">Read the protocol →</Link>
            </div>
          </div>
        </section>

        <footer className="mono flex flex-col gap-3 pt-12 text-[10px] tracking-[0.08em] text-[var(--muted-ink)] sm:flex-row sm:items-center sm:justify-between">
          <span>PROOFPAY / CASES SETTLED IN PUBLIC</span>
          <span>GENLAYER INTELLIGENT CONTRACTS · MVP</span>
          <span aria-label="Copyright 9ytshade">© 9YTSHADE</span>
        </footer>
      </div>
    </main>
  );
}

function ProcessCard({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <article className="bg-[var(--card)] p-6 sm:p-7">
      <span className="mono grid h-7 w-7 place-items-center rounded-full border border-[var(--ink)] text-[10px]">{number}</span>
      <h3 className="mt-12 text-3xl tracking-[-0.05em]">{title}</h3>
      <p className="mt-3 leading-6 text-[var(--muted-ink)]">{copy}</p>
    </article>
  );
}
