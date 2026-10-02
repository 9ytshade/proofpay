"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
type BountyDeskMode = "featured" | "all";

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

const PAGE_SIZE = 30;

export function BountyDesk({ mode = "featured" }: { mode?: BountyDeskMode }) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [state, setState] = useState<DeskState>("loading");
  const [selected, setSelected] = useState<Bounty | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadBounties = useCallback(async () => {
    setState("loading");
    try {
      const result = await discoverFinalBounties({ offset: 0, limit: mode === "featured" ? 10 : PAGE_SIZE });
      const loaded = result.bounties.map(toBounty).filter((bounty): bounty is Bounty => bounty !== null);
      setBounties(loaded.sort((left, right) => Number(right.id) - Number(left.id)));
      setTotalCount(result.totalCount);
      setFailedIds(result.failedIds);
      setHasMore(result.hasMore);
      setState("ready");
    } catch {
      setBounties([]);
      setTotalCount(0);
      setFailedIds([]);
      setHasMore(false);
      setState("error");
    }
  }, [mode]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = bounties.length + failedIds.length;
      const result = await discoverFinalBounties({ offset, limit: PAGE_SIZE });
      const loaded = result.bounties.map(toBounty).filter((bounty): bounty is Bounty => bounty !== null);
      setBounties((prev) => {
        const merged = [...prev];
        for (const item of loaded) {
          if (!merged.some((b) => b.id === item.id)) {
            merged.push(item);
          }
        }
        return merged.sort((left, right) => Number(right.id) - Number(left.id));
      });
      setTotalCount(result.totalCount);
      setFailedIds((prev) => Array.from(new Set([...prev, ...result.failedIds])));
      setHasMore(result.hasMore);
    } catch {
      // Keep existing data
    } finally {
      setLoadingMore(false);
    }
  };

  const retryFailedReads = async () => {
    if (retrying || failedIds.length === 0) return;
    setRetrying(true);
    try {
      const result = await discoverFinalBounties({ specificIds: failedIds });
      const recovered = result.bounties.map(toBounty).filter((bounty): bounty is Bounty => bounty !== null);
      if (recovered.length > 0) {
        setBounties((prev) => {
          const merged = [...prev];
          for (const item of recovered) {
            if (!merged.some((b) => b.id === item.id)) {
              merged.push(item);
            }
          }
          return merged.sort((left, right) => Number(right.id) - Number(left.id));
        });
      }
      setFailedIds(result.failedIds);
    } catch {
      // Keep failedIds on error
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadBounties(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadBounties]);

  const filteredBounties = bounties.filter((bounty) => {
    const matchesSearch = `${bounty.title} ${bounty.brief}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (statusFilter === "all" || bounty.status === statusFilter);
  });
  const visibleBounties = mode === "featured" ? filteredBounties.slice(0, 3) : filteredBounties;

  return (
    <>
      <section id="bounties" className="reveal reveal-delay-3 border-y border-[var(--ink)] py-5 sm:py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="mono text-[10px] tracking-[0.12em] text-[var(--muted-ink)]">{mode === "featured" ? "RECENT BOUNTIES" : "FINALIZED BOUNTY RECORDS"}</p><p className="mt-1 text-sm text-[var(--muted-ink)]">Read directly from ProofPay on Studionet.</p></div>
          <div className="flex items-center gap-2"><span className="mono rounded-full bg-[var(--verdict)] px-3 py-1 text-[10px] font-medium tracking-[0.08em] text-[#18231f]">{state === "ready" ? `${bounties.length} OF ${totalCount} ON-CHAIN` : "SYNCING"}</span><button onClick={() => void loadBounties()} className="mono rounded-full border border-[var(--line)] px-3 py-1 text-[10px] tracking-[.08em] transition hover:border-[var(--ink)]">REFRESH</button></div>
        </div>

        {failedIds.length > 0 && (
          <div className="mb-5 border border-[#c48737] bg-[#fffaf0] p-4 text-[#5c3e10] dark:bg-[#251b0f] dark:text-[#f4d799] dark:border-[#825c27]" role="alert">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mono text-[10px] font-bold tracking-[0.1em] text-[#8c5817] dark:text-[#f3bf65]">
                  PARTIAL ON-CHAIN DATA WARNING
                </p>
                <p className="mt-1 text-xs">
                  {failedIds.length} bounty record{failedIds.length === 1 ? " was" : "s were"} not returned by the RPC (Failed ID{failedIds.length === 1 ? "" : "s"}: {failedIds.slice(0, 5).map(id => `#${id}`).join(", ")}{failedIds.length > 5 ? "…" : ""}).
                </p>
              </div>
              <button
                onClick={() => void retryFailedReads()}
                disabled={retrying}
                className="mono rounded border border-[#8c5817] px-3 py-1 text-[10px] tracking-[0.08em] transition hover:bg-[#8c5817] hover:text-white disabled:opacity-50"
              >
                {retrying ? "RETRYING…" : `RETRY FAILED (${failedIds.length})`}
              </button>
            </div>
          </div>
        )}

        {mode === "featured" && <div className="mb-4 flex justify-end"><Link href="/bounties" className="mono text-[10px] tracking-[.08em] text-[var(--signal)] underline underline-offset-4">BROWSE ALL BOUNTIES →</Link></div>}
        {mode === "all" && <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem]"><label className="sr-only" htmlFor="bounty-search">Search bounty records</label><input id="bounty-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles and briefs" className="min-w-0 border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-ink)] focus:border-[var(--signal)]" /><label className="sr-only" htmlFor="bounty-status">Filter by bounty status</label><select id="bounty-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--signal)]"><option value="all">All statuses</option><option value="open">Open</option><option value="awarded">Awarded</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></div>}
        {state === "loading" && <DeskPlaceholder />}
        {state === "error" && <DeskEmpty title="The public record is temporarily out of reach." copy="Check your internet connection, then refresh the finalized Studionet record." action={() => void loadBounties()} />}
        {state === "ready" && bounties.length === 0 && <DeskEmpty title="No bounties have been published yet." copy="Be the first client to lock an outcome and make the public case." />}
        {state === "ready" && bounties.length > 0 && visibleBounties.length === 0 && <DeskEmpty title="No matching bounty records." copy="Try another search or status filter." />}
        {state === "ready" && visibleBounties.length > 0 && <div className="grid divide-y divide-[var(--line)] md:grid-cols-2 md:divide-x md:divide-y-0">{visibleBounties.map((bounty) => <BountyCard bounty={bounty} key={String(bounty.id)} onQuickView={() => setSelected(bounty)} />)}</div>}

        {mode === "all" && hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="mono rounded-full border border-[var(--ink)] bg-[var(--card)] px-6 py-2.5 text-xs font-medium tracking-[0.08em] transition hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:opacity-50"
            >
              {loadingMore ? "LOADING OLDER BOUNTIES…" : `LOAD MORE BOUNTIES (${bounties.length} OF ${totalCount} LOADED)`}
            </button>
          </div>
        )}
      </section>
      {selected && <BountyDetail bounty={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function BountyCard({ bounty, onQuickView }: { bounty: Bounty; onQuickView: () => void }) {
  const status = bounty.status.toUpperCase();
  return <article className="group bg-[var(--paper)] p-5 transition hover:bg-[var(--card)] md:first:pl-0 md:last:pr-0">
    <Link href={`/bounties/${bounty.id}`} className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal)]">
      <div className="flex items-center justify-between gap-3 text-[var(--muted-ink)]"><span className="mono text-[10px] tracking-[0.1em]">CASE #{bounty.id}</span><span className={statusClass(bounty.status)}>{status}</span></div>
      <h3 className="mt-7 max-w-[23rem] text-3xl leading-[0.95] tracking-[-0.05em] transition group-hover:text-[var(--signal)]">{bounty.title}</h3>
      <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-5 text-[var(--muted-ink)]">{bounty.brief}</p>
      <div className="mt-7 flex items-end justify-between border-t border-[var(--line)] pt-3"><div><span className="mono text-xs text-[var(--signal)]">{formatGen(bounty.reward)} GEN</span><p className="mono mt-1 text-[9px] tracking-[.06em] text-[var(--muted-ink)]">{bounty.submission_count} SUBMISSION{Number(bounty.submission_count) === 1 ? "" : "S"} · {deadlineState(bounty.deadline, bounty.status).toUpperCase()}</p></div><span aria-hidden="true" className="text-xl transition group-hover:translate-x-1">↗</span></div>
    </Link>
    <button onClick={onQuickView} className="mono mt-4 text-[9px] tracking-[.08em] text-[var(--muted-ink)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]">QUICK VIEW</button>
  </article>;
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
