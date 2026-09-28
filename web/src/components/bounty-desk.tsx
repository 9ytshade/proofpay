"use client";

import { useCallback, useEffect, useState } from "react";
import {
  discoverFinalBounties,
  formatGen,
  shortAddress,
} from "@/lib/genlayer";

type Bounty = {
  approved_submission_id: number | string;
  brief: string;
  client: string;
  criteria: string;
  deadline: number | string;
  id: number | string;
  reward: string;
  status: string;
  submission_count: number | string;
  title: string;
};

type DeskState = "loading" | "ready" | "error";

function toBounty(value: unknown): Bounty | null {
  if (!value || typeof value !== "object") return null;
  const bounty = value as Record<string, unknown>;
  const required = ["id", "title", "brief", "criteria", "reward", "deadline", "status", "client", "submission_count", "approved_submission_id"];
  if (required.some((key) => bounty[key] === undefined)) return null;
  return bounty as unknown as Bounty;
}

function readableCriteria(criteria: string) {
  return criteria
    .replace(/` then a newline, `?/g, "\n")
    .split("\n")
    .map((item) => item.replace(/`/g, "").trim())
    .filter(Boolean);
}

function deadlineLabel(value: number | string) {
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.valueOf()) ? "Deadline unavailable" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function deadlineState(value: number | string, status: string) {
  if (status !== "open") return status === "awarded" ? "settled" : status;
  const difference = Number(value) * 1000 - Date.now();
  if (difference <= 0) return "deadline passed";
  const hours = Math.ceil(difference / 3_600_000);
  return hours < 24 ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`;
}

function statusClass(status: string) { return `status-badge status-${status.toLowerCase()}`; }

export function BountyDesk() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [state, setState] = useState<DeskState>("loading");
  const [selected, setSelected] = useState<Bounty | null>(null);

  const loadBounties = useCallback(async () => {
    setState("loading");
    try {
      const results = await discoverFinalBounties();
      const loaded = results.map(toBounty).filter((bounty): bounty is Bounty => bounty !== null);
      setBounties(loaded.sort((left, right) => Number(right.id) - Number(left.id)));
      setState("ready");
    } catch {
      setBounties([]);
      setState("error");
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadBounties(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadBounties]);

  return (
    <>
      <section id="bounties" className="reveal reveal-delay-3 border-y border-[var(--ink)] py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="mono text-[10px] tracking-[0.12em] text-[var(--muted-ink)]">FINALIZED BOUNTY RECORD</p><p className="mt-1 text-sm text-[var(--muted-ink)]">Read directly from ProofPay on Studionet.</p></div>
          <div className="flex items-center gap-2"><span className="mono rounded-full bg-[var(--verdict)] px-3 py-1 text-[10px] tracking-[0.08em]">{state === "ready" ? `${bounties.length} ON-CHAIN` : "SYNCING"}</span><button onClick={() => void loadBounties()} className="mono rounded-full border border-[var(--line)] px-3 py-1 text-[10px] tracking-[.08em] transition hover:border-[var(--ink)]">REFRESH</button></div>
        </div>
        {state === "loading" && <DeskPlaceholder />}
        {state === "error" && <DeskEmpty title="The public record is temporarily out of reach." copy="Check your internet connection, then refresh the finalized Studionet record." action={() => void loadBounties()} />}
        {state === "ready" && bounties.length === 0 && <DeskEmpty title="No bounties have been published yet." copy="Be the first client to lock an outcome and make the public case." />}
        {state === "ready" && bounties.length > 0 && <div className="grid divide-y divide-[var(--line)] md:grid-cols-2 md:divide-x md:divide-y-0">{bounties.map((bounty) => <BountyCard bounty={bounty} key={String(bounty.id)} onOpen={() => setSelected(bounty)} />)}</div>}
      </section>
      {selected && <BountyDetail bounty={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function BountyCard({ bounty, onOpen }: { bounty: Bounty; onOpen: () => void }) {
  const status = bounty.status.toUpperCase();
  return <button onClick={onOpen} className="group bg-[var(--paper)] p-5 text-left transition hover:bg-[var(--card)] md:first:pl-0 md:last:pr-0"><div className="flex items-center justify-between gap-3 text-[var(--muted-ink)]"><span className="mono text-[10px] tracking-[0.1em]">CASE #{bounty.id}</span><span className={statusClass(bounty.status)}>{status}</span></div><h3 className="mt-7 max-w-[23rem] text-3xl leading-[0.95] tracking-[-0.05em] transition group-hover:text-[var(--signal)]">{bounty.title}</h3><p className="mt-3 line-clamp-2 max-w-xl text-sm leading-5 text-[var(--muted-ink)]">{bounty.brief}</p><div className="mt-7 flex items-end justify-between border-t border-[var(--line)] pt-3"><div><span className="mono text-xs text-[var(--signal)]">{formatGen(bounty.reward)} GEN</span><p className="mono mt-1 text-[9px] tracking-[.06em] text-[var(--muted-ink)]">{bounty.submission_count} SUBMISSION{Number(bounty.submission_count) === 1 ? "" : "S"} · {deadlineState(bounty.deadline, bounty.status).toUpperCase()}</p></div><span aria-hidden="true" className="text-xl transition group-hover:translate-x-1">↗</span></div></button>;
}

function BountyDetail({ bounty, onClose }: { bounty: Bounty; onClose: () => void }) {
  const criteria = readableCriteria(bounty.criteria);
  const winner = Number(bounty.approved_submission_id);
  return <div className="fixed inset-0 z-20 grid place-items-end bg-[#101714]/40 p-3 backdrop-blur-[2px] sm:p-6" role="dialog" aria-modal="true" aria-label={`Bounty ${bounty.id} details`}><article className="detail-sheet max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-auto rounded-[1.5rem] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[-10px_12px_0_var(--ink)] sm:max-h-[calc(100dvh-3rem)] sm:p-9"><div className="flex items-start justify-between gap-6"><div><p className="mono text-[10px] tracking-[.12em] text-[var(--signal)]">ON-CHAIN CASE #{bounty.id}</p><h2 className="mt-3 text-4xl leading-[.92] tracking-[-.06em] sm:text-5xl">{bounty.title}</h2></div><button onClick={onClose} className="mono grid h-9 w-9 place-items-center rounded-full border border-[var(--ink)] text-xs transition hover:bg-[var(--ink)] hover:text-[var(--paper)]" aria-label="Close bounty details">×</button></div><div className="mt-8 grid gap-3 border-y border-[var(--line)] py-4 sm:grid-cols-3"><DetailMetric label="ESCROW" value={`${formatGen(bounty.reward)} GEN`} /><DetailMetric label="STATUS" value={bounty.status.toUpperCase()} /><DetailMetric label="DEADLINE" value={deadlineLabel(bounty.deadline)} /></div><section className="mt-8"><p className="mono text-[10px] tracking-[.12em] text-[var(--muted-ink)]">THE BRIEF</p><p className="mt-3 text-lg leading-7">{bounty.brief}</p></section><section className="mt-8"><p className="mono text-[10px] tracking-[.12em] text-[var(--muted-ink)]">ACCEPTANCE CRITERIA</p><ol className="mt-3 space-y-3">{criteria.map((criterion, index) => <li className="grid grid-cols-[1.5rem_1fr] gap-3" key={criterion}><span className="mono text-xs text-[var(--signal)]">0{index + 1}</span><span className="text-[var(--muted-ink)]">{criterion}</span></li>)}</ol></section><div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5"><p className="mono text-[10px] tracking-[.08em] text-[var(--muted-ink)]">CLIENT {shortAddress(bounty.client)} · {bounty.submission_count} EVIDENCE RECORDS</p><span className={statusClass(bounty.status)}>{winner > 0 ? `WINNER #${winner}` : bounty.status === "open" ? "AWAITING EVIDENCE" : "NO PAYOUT"}</span></div></article></div>;
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="mono text-[9px] tracking-[.1em] text-[var(--muted-ink)]">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}

function DeskPlaceholder() {
  return <div className="grid animate-pulse divide-y divide-[var(--line)] md:grid-cols-2 md:divide-x md:divide-y-0">{[1, 2].map((item) => <div className="p-5 md:first:pl-0" key={item}><div className="h-3 w-20 rounded bg-[var(--line)]" /><div className="mt-7 h-8 w-3/4 rounded bg-[var(--line)]" /><div className="mt-3 h-4 w-full rounded bg-[var(--line)]" /><div className="mt-7 h-4 w-24 rounded bg-[var(--line)]" /></div>)}</div>;
}

function DeskEmpty({ title, copy, action }: { title: string; copy: string; action?: () => void }) { return <div className="empty-state"><span className="empty-state-mark" aria-hidden="true">P</span><div><p className="text-xl tracking-[-.04em]">{title}</p><p className="mt-2 max-w-md text-sm leading-5 text-[var(--muted-ink)]">{copy}</p>{action && <button onClick={action} className="mono mt-4 text-[10px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4">TRY AGAIN</button>}</div></div>; }
