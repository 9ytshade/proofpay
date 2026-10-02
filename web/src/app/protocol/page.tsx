import Link from "next/link";

const sections = [
  ["model", "The model"],
  ["lifecycle", "Bounty lifecycle"],
  ["decision", "How decisions work"],
  ["protections", "Contract protections"],
  ["scope", "MVP scope"],
  ["network", "Network & risk"],
  ["undetermined", "Undetermined reviews"],
] as const;

export default function ProtocolPage() {
  return (
    <main className="grain min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="relative mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <header className="grid gap-10 border-b border-[var(--line)] py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-8">
            <p className="mono mb-6 text-[10px] tracking-[0.13em] text-[var(--signal)]">PROOFPAY / PROTOCOL GUIDE</p>
            <h1 className="max-w-4xl text-6xl leading-[0.86] tracking-[-0.07em] sm:text-8xl">A public path from proof to payment.</h1>
            <p className="mt-8 max-w-2xl text-lg leading-7 text-[var(--muted-ink)] sm:text-xl">The rules behind ProofPay’s public software bounties: how funds are held, what builders submit, how GenLayer evaluates evidence, and when settlement can happen.</p>
          </div>
          <aside className="self-end border-l border-[var(--line)] pl-5 md:col-span-4 md:pl-8">
            <p className="mono text-[10px] tracking-[0.12em] text-[var(--muted-ink)]">THE SHORT VERSION</p>
            <p className="mt-4 text-2xl leading-7">A funded brief. Public evidence. A finalized verdict. One transparent outcome.</p>
          </aside>
        </header>

        <div className="grid gap-14 py-12 md:grid-cols-12 md:gap-16 md:py-16">
          <aside className="md:col-span-3">
            <p className="mono mb-4 text-[10px] tracking-[0.12em] text-[var(--muted-ink)]">IN THIS GUIDE</p>
            <nav aria-label="Protocol sections" className="flex flex-col items-start gap-3 border-l border-[var(--line)] pl-4 text-sm text-[var(--muted-ink)]">
              {sections.map(([id, label]) => <a key={id} className="transition hover:text-[var(--ink)]" href={`#${id}`}>{label}</a>)}
            </nav>
          </aside>

          <div className="space-y-16 md:col-span-9">
            <section id="model" className="scroll-mt-8">
              <SectionHeading number="01" title="The model" />
              <p className="max-w-3xl text-lg leading-7 text-[var(--muted-ink)]">ProofPay is an escrow marketplace for public web-development work. A client locks a reward in a GenLayer Intelligent Contract. A builder submits a public GitHub repository, a live HTTPS deployment, and a concise explanation. GenLayer validators assess that evidence against the brief, and the contract acts only after the verdict reaches finality.</p>
              <div className="mt-8 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
                <ProtocolCard index="A" title="Client" text="Defines the outcome, acceptance criteria, deadline, and GEN reward." />
                <ProtocolCard index="B" title="Builder" text="Publishes source, a live deployment, and a clear evidence summary." />
                <ProtocolCard index="C" title="Viewer" text="Can inspect the public brief, proof links, decisions, and settlement state." />
              </div>
            </section>

            <section id="lifecycle" className="scroll-mt-8">
              <SectionHeading number="02" title="Bounty lifecycle" />
              <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                <LifecycleStep number="01" title="Create and fund" text="The client posts a public brief with 1 to 10 explicit acceptance criteria, a future deadline, and a positive GEN reward. The reward is transferred with the creation transaction and held in escrow." />
                <LifecycleStep number="02" title="Submit public proof" text="Before the deadline, builders can submit a public GitHub repository URL, an HTTPS deployment URL, and a short summary. The client cannot submit to their own bounty." />
                <LifecycleStep number="03" title="Adjudicate" text="An eligible caller starts intelligent review. Validators inspect the submitted material as evidence, not as instructions, and produce a criterion-by-criterion verdict." />
                <LifecycleStep number="04" title="Settle after finality" text="If the finalized verdict approves the submission, the contract selects that builder and pays the escrowed reward. A wallet confirmation alone is not a completed settlement." />
              </ol>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="border border-[var(--line)] bg-[var(--card)] p-5"><p className="mono text-[10px] tracking-[0.1em] text-[var(--signal)]">REJECTION</p><p className="mt-3 leading-6 text-[var(--muted-ink)]">A rejected attempt leaves the bounty open and the reward escrowed. Another builder can submit while the bounty remains eligible.</p></div>
                <div className="border border-[var(--line)] bg-[var(--card)] p-5"><p className="mono text-[10px] tracking-[0.1em] text-[var(--signal)]">REFUND</p><p className="mt-3 leading-6 text-[var(--muted-ink)]">A client may cancel an open bounty only before any submission. An unresolved bounty can be refunded only after its review window expires.</p></div>
              </div>
            </section>

            <section id="decision" className="scroll-mt-8">
              <SectionHeading number="03" title="How decisions work" />
              <div className="grid gap-8 md:grid-cols-12">
                <p className="text-lg leading-7 text-[var(--muted-ink)] md:col-span-7">ProofPay v2 operates on a strict binary consensus rule: <strong className="font-medium text-[var(--ink)]">every single acceptance criterion must PASS</strong> for a submission to be approved (100% score). If even one criterion fails (FAIL), the submission is rejected. The smart contract independently computes the final score and outcome directly from validator criterion results.</p>
                <aside className="border-l-2 border-[var(--signal)] pl-5 md:col-span-5"><p className="mono text-[10px] tracking-[0.1em] text-[var(--signal)]">EVIDENCE RULE</p><p className="mt-3 leading-6 text-[var(--muted-ink)]">Fetched pages and repository content are untrusted input. They may support or fail to support a criterion, but cannot override the protocol or instruct validators.</p></aside>
              </div>
              <p className="mt-6 max-w-3xl leading-6 text-[var(--muted-ink)]">If an evidence URL returns deterministic errors (such as HTTP 401, 403, 404, or 410), the submission is evaluated as REJECTED without payout. If external endpoints return transient errors (such as HTTP 429 rate limiting or 502/503/504 gateway failures), the verdict records UNDETERMINED, preserving the escrow and allowing the adjudication to be retried.</p>
            </section>

            <section id="protections" className="scroll-mt-8">
              <SectionHeading number="04" title="Contract protections" />
              <ul className="grid gap-x-10 gap-y-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
                <Protection text="A bounty reward is funded at creation and can be paid at most once." />
                <Protection text="Only the selected builder can receive an approved reward." />
                <Protection text="The client cannot cancel after any submission is recorded." />
                <Protection text="A rejected verdict leaves funds escrowed and the bounty open." />
                <Protection text="A refund and a payout cannot both occur for the same bounty." />
                <Protection text="Approval locks the bounty against further submissions and cancellation." />
                <Protection text="Payout follows finalized adjudication, not a pending wallet prompt." />
                <Protection text="Bounty and submission history remain publicly inspectable." />
              </ul>
            </section>

            <section id="scope" className="scroll-mt-8">
              <SectionHeading number="05" title="MVP scope" />
              <div className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
                <div className="bg-[var(--card)] p-6"><p className="mono text-[10px] tracking-[0.1em] text-[var(--signal)]">SUPPORTED NOW</p><ul className="mt-4 space-y-3 text-sm leading-5 text-[var(--muted-ink)]"><li>Public web-development bounties.</li><li>One reward and one winning builder per bounty.</li><li>Public GitHub source and a live HTTPS deployment.</li><li>Between 1 and 10 explicit acceptance criteria.</li><li>Public, on-chain bounty and decision records.</li></ul></div>
                <div className="bg-[var(--card)] p-6"><p className="mono text-[10px] tracking-[0.1em] text-[var(--signal)]">NOT IN THIS MVP</p><ul className="mt-4 space-y-3 text-sm leading-5 text-[var(--muted-ink)]"><li>Private evidence, uploads, or arbitrary files.</li><li>Fiat or stablecoin settlement.</li><li>Manual arbitration or a client override.</li><li>Teams, reputation, messaging, or platform fees.</li><li>Multiple winners or shared reward distributions.</li></ul></div>
              </div>
              <p className="mt-5 leading-6 text-[var(--muted-ink)]">The winner policy is first verified winner: the first submission to receive a finalized approval earns the full reward. A later submission cannot be paid after the bounty is awarded, even if its work also meets the brief.</p>
            </section>

            <section id="network" className="scroll-mt-8">
              <SectionHeading number="06" title="Network & risk" />
              <div className="border border-[var(--line)] bg-[var(--card)] p-6 sm:p-8">
                <p className="text-xl leading-7">ProofPay is currently a Studionet MVP for public testing. Use test GEN only.</p>
                <p className="mt-4 leading-6 text-[var(--muted-ink)]">This site is not a mainnet or production financial service. Network transaction costs, if any, are separate from the bounty reward. The project’s production-readiness checklist still requires compatible fee-profile generation and review, fee estimates for each write, and a complete end-to-end smoke test on the intended network.</p>
                <a className="mono mt-6 inline-block text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4" href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer">OPEN STUDIONET EXPLORER ↗</a>
              </div>
            </section>

            <section id="undetermined" className="scroll-mt-8">
              <SectionHeading number="07" title="Undetermined reviews" />
              <p className="max-w-3xl text-lg leading-7 text-[var(--muted-ink)]">When external infrastructure experiences transient connection errors (HTTP 429 rate-limiting or 5xx server downtime), GenLayer validators reach an UNDETERMINED consensus verdict. The submission remains safely preserved on-chain in submitted status with zero escrow payout, allowing any participant to re-trigger adjudication once external endpoints recover.</p>
            </section>

            <div className="border-t border-[var(--line)] pt-8">
              <p className="text-2xl leading-8">Proof first. Payment next.</p>
              <Link href="/bounties" className="mono mt-5 inline-block text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">RETURN TO THE BOUNTY DESK →</Link>
            </div>
          </div>
        </div>

        <footer className="mono flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-[10px] tracking-[0.08em] text-[var(--muted-ink)] sm:flex-row sm:items-center sm:justify-between">
          <span>PROOFPAY / PROTOCOL GUIDE</span>
          <span>GENLAYER INTELLIGENT CONTRACTS · MVP</span>
          <span aria-label="Copyright 9ytshade">© 9YTSHADE</span>
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return <div className="mb-6 flex items-start gap-4"><span className="mono mt-2 text-[10px] text-[var(--signal)]">{number}</span><h2 className="text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">{title}</h2></div>;
}

function ProtocolCard({ index, title, text }: { index: string; title: string; text: string }) {
  return <article className="bg-[var(--card)] p-5"><p className="mono text-[10px] text-[var(--signal)]">{index}</p><h3 className="mt-7 text-2xl tracking-[-0.04em]">{title}</h3><p className="mt-2 text-sm leading-5 text-[var(--muted-ink)]">{text}</p></article>;
}

function LifecycleStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <li className="grid gap-3 py-5 sm:grid-cols-[36px_180px_1fr] sm:gap-5"><span className="mono text-[10px] text-[var(--signal)]">{number}</span><h3 className="text-lg">{title}</h3><p className="text-sm leading-6 text-[var(--muted-ink)]">{text}</p></li>;
}

function Protection({ text }: { text: string }) {
  return <li className="flex gap-3 text-sm leading-5 text-[var(--muted-ink)]"><span className="text-[var(--signal)]" aria-hidden="true">+</span><span>{text}</span></li>;
}