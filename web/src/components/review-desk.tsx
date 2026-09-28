"use client";

import { useCallback, useEffect, useState } from "react";
import { createProofPayClient, discoverFinalBounties, formatGen, proofPayContractAddress, readFinalContract, shortAddress } from "@/lib/genlayer";
import { TransactionLifecycle } from "@/components/transaction-lifecycle";

type Bounty = { id: number | string; title: string; reward: string; status: string; submission_count: number | string; approved_submission_id: number | string };
type Submission = { bounty_id: number | string; submission_id: number | string; builder: string; repository_url: string; deployment_url: string; summary: string; status: string; score: number | string; reason: string; verdict_id: number | string };
type Verdict = { approved: boolean; required_criteria_passed: boolean; score: number | string; criteria_report: string; reason: string };
type ReviewRecord = { bounty: Bounty; submission: Submission; verdict?: Verdict };

function isRecord(value: unknown, keys: string[]) { return Boolean(value) && typeof value === "object" && !keys.some((key) => (value as Record<string, unknown>)[key] === undefined); }
function shortHash(hash: string) { return `${hash.slice(0, 10)}…${hash.slice(-8)}`; }

export function ReviewDesk() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const bountyReads = await discoverFinalBounties();
      const bounties = bountyReads.flatMap((read) => isRecord(read, ["id", "title", "reward", "status", "submission_count", "approved_submission_id"]) ? [read as unknown as Bounty] : []);
      const submissions = await Promise.allSettled(bounties.flatMap((bounty) => Array.from({ length: Number(bounty.submission_count) }, (_, index) => ({ bounty, submissionId: index + 1 })).map(async ({ bounty, submissionId }) => {
        const submission = await readFinalContract("get_submission", [Number(bounty.id), submissionId]);
        if (!isRecord(submission, ["submission_id", "builder", "status", "verdict_id"])) return null;
        const typedSubmission = submission as unknown as Submission;
        let verdict: Verdict | undefined;
        if (Number(typedSubmission.verdict_id) > 0) {
          const result = await readFinalContract("get_verdict", [Number(typedSubmission.verdict_id)]);
          if (isRecord(result, ["approved", "required_criteria_passed", "score", "criteria_report", "reason"])) verdict = result as unknown as Verdict;
        }
        return { bounty, submission: typedSubmission, verdict };
      })));
      setRecords(submissions.flatMap((read) => read.status === "fulfilled" && read.value ? [read.value] : []).sort((left, right) => Number(right.bounty.id) - Number(left.bounty.id)));
    } catch { setError("Could not load finalized submissions. Check your connection, then refresh."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadRecords(), 0); return () => window.clearTimeout(timer); }, [loadRecords]);

  async function adjudicate(record: ReviewRecord) {
    const key = `${record.bounty.id}:${record.submission.submission_id}`;
    setReviewing(key); setError(""); setTransactionHash("");
    try {
      if (!window.ethereum) throw new Error("Install or unlock MetaMask before starting the review.");
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
      if (!address) throw new Error("Connect a wallet from the header first.");
      const hash = await createProofPayClient(address as `0x${string}`).writeContract({ address: proofPayContractAddress as `0x${string}`, functionName: "adjudicate_submission", args: [Number(record.bounty.id), Number(record.submission.submission_id)], value: BigInt(0) });
      setTransactionHash(String(hash));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The intelligent review could not be started."); } finally { setReviewing(""); }
  }

  return <section id="review" className="scroll-mt-8 py-20 md:py-28"><div className="grid gap-9 md:grid-cols-12"><div className="md:col-span-4"><p className="mono text-[10px] tracking-[.12em] text-[var(--signal)]">INTELLIGENT REVIEW DESK</p><h2 className="mt-4 max-w-sm text-5xl leading-[.9] tracking-[-.06em] sm:text-6xl">Evidence in.<br /><span className="italic">Verdict out.</span></h2><p className="mt-5 max-w-sm leading-6 text-[var(--muted-ink)]">Anyone can start review of a submitted proof. GenLayer validators retrieve the public evidence, assess it against the brief, and settle escrow only when every requirement passes.</p><div className="mt-8 border-l-2 border-[var(--signal)] pl-4"><p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">LIVE CONSENSUS</p><p className="mt-2 text-sm leading-5">Starting a review creates a fee-bearing consensus transaction. The bounty reward is never sent by this action—it stays protected until an approved verdict.</p></div></div><div className="space-y-4 md:col-span-8"><div className="flex items-center justify-between border-b border-[var(--line)] pb-3"><p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">FINALIZED SUBMISSION RECORDS</p><button onClick={() => void loadRecords()} className="mono rounded-full border border-[var(--line)] px-3 py-1 text-[10px] tracking-[.08em] transition hover:border-[var(--ink)]">REFRESH</button></div>{loading && <p className="py-8 text-[var(--muted-ink)]">Loading finalized evidence records…</p>}{error && <p className="creator-message creator-message-error">{error}</p>}{!loading && !records.length && !error && <p className="py-8 text-[var(--muted-ink)]">No submissions exist for the configured bounty records.</p>}{records.map((record) => <ReviewCard key={`${record.bounty.id}:${record.submission.submission_id}`} record={record} reviewing={reviewing === `${record.bounty.id}:${record.submission.submission_id}`} onAdjudicate={() => void adjudicate(record)} />)}{transactionHash && <div><p className="mono mt-5 text-[10px] tracking-[.08em] text-[var(--muted-ink)]">REVIEW TRANSACTION {shortHash(transactionHash)}</p><TransactionLifecycle hash={transactionHash} action="Intelligent review" /></div>}</div></div></section>;
}

function ReviewCard({ record, reviewing, onAdjudicate }: { record: ReviewRecord; reviewing: boolean; onAdjudicate: () => void }) {
  const { bounty, submission, verdict } = record;
  const submitted = submission.status === "submitted";
  const approved = submission.status === "approved";
  return <article className={`review-card ${approved ? "review-approved" : submission.status === "rejected" ? "review-rejected" : ""}`}><div className="flex flex-wrap items-center justify-between gap-3"><p className="mono text-[10px] tracking-[.1em]">CASE #{bounty.id} · EVIDENCE #{submission.submission_id}</p><span className="mono rounded-full border border-[var(--line)] px-3 py-1 text-[10px] tracking-[.08em]">{submission.status.toUpperCase()}</span></div><h3 className="mt-4 text-3xl leading-[.95] tracking-[-.05em]">{bounty.title}</h3><div className="mt-5 grid gap-3 border-y border-[var(--line)] py-4 sm:grid-cols-3"><Metric label="ESCROW" value={`${formatGen(bounty.reward)} GEN`} /><Metric label="BUILDER" value={shortAddress(submission.builder)} /><Metric label="SCORE" value={verdict ? `${verdict.score}/100` : "Awaiting review"} /></div><p className="mt-5 text-sm leading-6 text-[var(--muted-ink)]">{submission.summary}</p><div className="mt-4 flex flex-wrap gap-3"><a href={submission.repository_url} target="_blank" rel="noreferrer" className="mono text-[10px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4">VIEW REPOSITORY ↗</a><a href={submission.deployment_url} target="_blank" rel="noreferrer" className="mono text-[10px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4">VIEW DEPLOYMENT ↗</a></div>{verdict && <div className={`verdict-card ${verdict.approved ? "verdict-approved" : "verdict-rejected"}`}><p className="mono text-[10px] tracking-[.1em]">{verdict.approved ? "APPROVED · REWARD SETTLED" : "NOT APPROVED · ESCROW REMAINS OPEN"}</p><p className="mt-3 text-sm leading-6">{verdict.reason}</p><p className="mt-3 border-t border-current/15 pt-3 text-sm leading-6 opacity-80">{verdict.criteria_report}</p></div>}{submitted && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-5"><p className="max-w-sm text-sm leading-5 text-[var(--muted-ink)]">This starts GenLayer’s public-evidence evaluation. It may use fee balance and can take several consensus phases.</p><button onClick={onAdjudicate} disabled={reviewing} className="rounded-full bg-[var(--signal)] px-5 py-3 text-sm text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{reviewing ? "Opening wallet…" : "Start intelligent review"}</button></div>}</article>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="mono text-[9px] tracking-[.1em] text-[var(--muted-ink)]">{label}</p><p className="mt-1 text-sm">{value}</p></div>; }
