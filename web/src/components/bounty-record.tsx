"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  createProofPayClient,
  formatGen,
  proofPayContractAddress,
  readFinalContract,
  shortAddress,
} from "@/lib/genlayer";
import { parseCriteriaResults } from "@/lib/safety";
import { TransactionLifecycle } from "@/components/transaction-lifecycle";

type Bounty = {
  id: number | string;
  title: string;
  brief: string;
  criteria: string;
  client: string;
  reward: string;
  deadline: number | string;
  status: string;
  submission_count: number | string;
  approved_submission_id: number | string;
};

type Submission = {
  bounty_id: number | string;
  submission_id: number | string;
  builder: string;
  repository_url: string;
  repository_owner?: string;
  repository_name?: string;
  commit_sha?: string;
  evidence_paths?: string;
  deployment_url: string;
  summary: string;
  status: string;
  score: number | string;
  reason: string;
  verdict_id: number | string;
  review_count?: number | string;
  last_outcome?: string;
};

type Verdict = {
  id?: number | string;
  bounty_id?: number | string;
  submission_id?: number | string;
  approved: boolean;
  required_criteria_passed: boolean;
  outcome?: string;
  score: number | string;
  criteria_results?: string[] | string;
  criteria_report: string;
  reason: string;
  evidence_note?: string;
};

type SubmissionRecord = { submission: Submission; verdict?: Verdict };
type LoadState = "loading" | "ready" | "error";

function asRecord(value: unknown, requiredKeys: string[]) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (requiredKeys.some((key) => record[key] === undefined)) return null;
  return record;
}

function parseCriteria(value: string) {
  return value
    .replace(/` then a newline, `?/g, "\n")
    .split("\n")
    .map((criterion) => criterion.replace(/`/g, "").trim())
    .filter(Boolean);
}

function deadlineLabel(value: number | string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return "Deadline unavailable";
  return (
    new Date(timestamp * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC"
  );
}

const REVIEW_WINDOW_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function BountyRecord() {
  const { id: rawId } = useParams<{ id: string }>();
  const bountyId = Number(rawId);
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [currentTime, setCurrentTime] = useState(0);
  const [connectedAccount, setConnectedAccount] = useState<string>("");
  const [actionState, setActionState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [actionTxHash, setActionTxHash] = useState("");
  const [actionType, setActionType] = useState<"cancel" | "refund">("cancel");

  // Check connected account
  useEffect(() => {
    async function checkAccount() {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
          if (Array.isArray(accounts) && accounts[0]) {
            setConnectedAccount(accounts[0].toLowerCase());
          }
        } catch {
          // Ignore
        }
      }
    }
    void checkAccount();
  }, []);

  const loadRecord = useCallback(async () => {
    if (!Number.isSafeInteger(bountyId) || bountyId <= 0) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      const bountyResult = asRecord(
        await readFinalContract("get_bounty", [bountyId]),
        ["id", "title", "brief", "criteria", "client", "reward", "deadline", "status", "submission_count", "approved_submission_id"],
      );
      if (!bountyResult) throw new Error("The bounty record has an unexpected shape.");
      const nextBounty = bountyResult as unknown as Bounty;
      const submissionCount = Number(nextBounty.submission_count);
      if (!Number.isSafeInteger(submissionCount) || submissionCount < 0) {
        throw new Error("The bounty has an invalid submission count.");
      }

      const records: SubmissionRecord[] = [];
      for (let firstId = 1; firstId <= submissionCount; firstId += 10) {
        const lastId = Math.min(firstId + 9, submissionCount);
        const batch = await Promise.all(
          Array.from({ length: lastId - firstId + 1 }, (_, index) => firstId + index).map(async (submissionId) => {
            const submissionResult = asRecord(
              await readFinalContract("get_submission", [bountyId, submissionId]),
              ["bounty_id", "submission_id", "builder", "repository_url", "deployment_url", "summary", "status", "score", "reason", "verdict_id"],
            );
            if (!submissionResult) throw new Error(`Submission ${submissionId} has an unexpected shape.`);
            const submission = submissionResult as unknown as Submission;
            let verdict: Verdict | undefined;
            const verdictId = Number(submission.verdict_id);
            if (verdictId > 0) {
              const verdictResult = asRecord(
                await readFinalContract("get_verdict", [verdictId]),
                ["approved", "required_criteria_passed", "score", "criteria_report", "reason"],
              );
              if (!verdictResult) throw new Error(`Verdict ${verdictId} has an unexpected shape.`);
              verdict = verdictResult as unknown as Verdict;
            }
            return { submission, verdict };
          }),
        );
        records.push(...batch);
      }

      setCurrentTime(Date.now());
      setBounty(nextBounty);
      setSubmissions(records);
      setState("ready");
    } catch {
      setBounty(null);
      setSubmissions([]);
      setState("error");
    }
  }, [bountyId]);

  useEffect(() => {
    const clock = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecord(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecord]);

  async function handleCancelBounty() {
    if (!bounty) return;
    setActionState("submitting");
    setActionMessage("");
    setActionTxHash("");
    setActionType("cancel");
    try {
      if (!window.ethereum) throw new Error("MetaMask is required to sign this transaction.");
      const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("Connect your client wallet first.");
      if (address.toLowerCase() !== bounty.client.toLowerCase()) {
        throw new Error("Only the bounty client address can cancel this bounty.");
      }
      const client = createProofPayClient(address as `0x${string}`);
      const hash = await client.writeContract({
        address: proofPayContractAddress as `0x${string}`,
        functionName: "cancel_bounty",
        args: [Number(bounty.id)],
        value: BigInt(0),
      });
      setActionTxHash(String(hash));
      setActionState("done");
      setActionMessage("Cancellation submitted to GenLayer. Escrow is refunded upon finality.");
    } catch (err) {
      setActionState("error");
      setActionMessage(err instanceof Error ? err.message : "Cancellation failed.");
    }
  }

  async function handleRefundExpiredBounty() {
    if (!bounty) return;
    setActionState("submitting");
    setActionMessage("");
    setActionTxHash("");
    setActionType("refund");
    try {
      if (!window.ethereum) throw new Error("MetaMask is required to sign this transaction.");
      const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("Connect your client wallet first.");
      if (address.toLowerCase() !== bounty.client.toLowerCase()) {
        throw new Error("Only the bounty client address can claim an expired refund.");
      }
      const client = createProofPayClient(address as `0x${string}`);
      const hash = await client.writeContract({
        address: proofPayContractAddress as `0x${string}`,
        functionName: "refund_expired_bounty",
        args: [Number(bounty.id)],
        value: BigInt(0),
      });
      setActionTxHash(String(hash));
      setActionState("done");
      setActionMessage("Refund request submitted to GenLayer. Escrow is refunded upon finality.");
    } catch (err) {
      setActionState("error");
      setActionMessage(err instanceof Error ? err.message : "Refund request failed.");
    }
  }

  if (state === "loading") {
    return <div className="py-16 text-[var(--muted-ink)]" role="status">Loading finalized bounty record…</div>;
  }

  if (state === "error" || !bounty) {
    return (
      <div className="py-16" role="alert">
        <p className="text-2xl tracking-[-0.04em]">This bounty record is unavailable.</p>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">It may not exist on the configured Studionet contract, or the finalized record could not be read.</p>
        <button type="button" onClick={() => void loadRecord()} className="mono mt-5 text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">TRY AGAIN</button>
      </div>
    );
  }

  const criteria = parseCriteria(bounty.criteria);
  const status = bounty.status.toLowerCase();
  const deadlineTimestamp = Number(bounty.deadline);
  const deadlinePassed = currentTime > 0 && deadlineTimestamp * 1000 <= currentTime;
  const reviewWindowPassed = currentTime > 0 && (deadlineTimestamp + REVIEW_WINDOW_SECONDS) * 1000 <= currentTime;
  const approvedSubmissionId = Number(bounty.approved_submission_id);
  const winner = submissions.find(({ submission }) => Number(submission.submission_id) === approvedSubmissionId);
  const canSubmit = status === "open" && !deadlinePassed;
  const hasSubmitted = submissions.some(({ submission }) => submission.status === "submitted");
  const isClient = connectedAccount.length > 0 && connectedAccount === bounty.client.toLowerCase();
  const submissionCount = Number(bounty.submission_count);
  const canCancel = isClient && status === "open" && submissionCount === 0;
  const canRefundExpired = isClient && status === "open" && reviewWindowPassed && !winner;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/bounties" className="mono text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">← ALL BOUNTIES</Link>
        <button type="button" onClick={() => void loadRecord()} className="mono rounded-full border border-[var(--line)] px-3 py-2 text-[10px] tracking-[0.08em] transition hover:border-[var(--ink)]">REFRESH FINALIZED RECORD</button>
      </div>

      <header className="border-b border-[var(--line)] pb-8 sm:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono text-[10px] tracking-[0.12em] text-[var(--signal)]">PROOFPAY / CASE #{bounty.id}</p>
          <span className={`status-badge status-${status}`}>{status.toUpperCase()}</span>
        </div>
        <h1 className="mt-5 max-w-5xl text-5xl leading-[0.9] tracking-[-0.06em] sm:text-7xl">{bounty.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-[var(--muted-ink)]">{bounty.brief}</p>
      </header>

      <section className="grid gap-5 border-b border-[var(--line)] py-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Bounty summary">
        <Metric label="ESCROW" value={`${formatGen(bounty.reward)} GEN`} />
        <Metric label="CLIENT" value={shortAddress(bounty.client)} />
        <Metric label="DEADLINE" value={deadlineLabel(bounty.deadline)} />
        <Metric label="SUBMISSIONS" value={String(bounty.submission_count)} />
      </section>

      <div className="grid gap-12 py-10 md:grid-cols-12 md:gap-16">
        <div className="space-y-10 md:col-span-7">
          <section>
            <SectionLabel>ACCEPTANCE CRITERIA</SectionLabel>
            <ol className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {criteria.map((criterion, index) => (
                <li key={`${index}-${criterion}`} className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                  <span className="mono text-[10px] text-[var(--signal)]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="leading-6">{criterion}</span>
                </li>
              ))}
            </ol>
          </section>

          {winner && (
            <section className="border-l-2 border-[var(--verdict)] pl-5">
              <SectionLabel>APPROVED SUBMISSION · WINNER</SectionLabel>
              <p className="mt-3 text-lg">Builder {shortAddress(winner.submission.builder)} received the finalized approval.</p>
              <Link href={`#submission-${winner.submission.submission_id}`} className="mono mt-3 inline-block text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">VIEW WINNING EVIDENCE ↓</Link>
            </section>
          )}

          <section id="submissions">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><SectionLabel>BUILDER EVIDENCE</SectionLabel><p className="mt-1 text-sm text-[var(--muted-ink)]">Public submissions and finalized verdicts.</p></div>
            </div>
            {submissions.length === 0 ? (
              <p className="mt-5 border-y border-[var(--line)] py-6 text-sm text-[var(--muted-ink)]">No submissions have been recorded for this bounty.</p>
            ) : (
              <div className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {submissions.map(({ submission, verdict }) => {
                  const paths = submission.evidence_paths
                    ? submission.evidence_paths.split("\n").map((p) => p.trim()).filter(Boolean)
                    : [];
                  const shortSha = submission.commit_sha
                    ? `${submission.commit_sha.slice(0, 7)}…${submission.commit_sha.slice(-7)}`
                    : null;
                  return (
                    <article id={`submission-${submission.submission_id}`} key={String(submission.submission_id)} className="scroll-mt-8 py-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="mono text-[10px] tracking-[0.08em]">
                          EVIDENCE #{submission.submission_id} · BUILDER {shortAddress(submission.builder)}
                          {shortSha && <span className="ml-2 text-[var(--muted-ink)]">({shortSha})</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          {submission.last_outcome && (
                            <span className={`mono rounded-full px-2 py-0.5 text-[9px] tracking-[0.06em] ${
                              submission.last_outcome === "APPROVED"
                                ? "bg-[var(--verdict)] text-[#18231f]"
                                : submission.last_outcome === "REJECTED"
                                  ? "bg-[#db6b5e]/20 text-[#b95046]"
                                  : "bg-[#e09138]/20 text-[#c27623]"
                            }`}>
                              {submission.last_outcome}
                            </span>
                          )}
                          <span className={`status-badge status-${submission.status.toLowerCase()}`}>{submission.status.toUpperCase()}</span>
                        </div>
                      </div>
                      <p className="mt-4 leading-6">{submission.summary}</p>
                      {paths.length > 0 && (
                        <div className="mt-3">
                          <p className="mono text-[9px] tracking-[.08em] text-[var(--muted-ink)]">BOUNDED EVIDENCE PATHS ({paths.length}):</p>
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {paths.map((path) => (
                              <li key={path} className="mono rounded border border-[var(--line)] bg-[var(--card)] px-2 py-0.5 text-[10px] text-[var(--ink)]">
                                {path}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                        <EvidenceLink href={submission.repository_url}>
                          {submission.commit_sha ? `COMMIT ${submission.commit_sha.slice(0, 10)}… ↗` : "VIEW SOURCE COMMIT ↗"}
                        </EvidenceLink>
                        <EvidenceLink href={submission.deployment_url}>VIEW DEPLOYMENT ↗</EvidenceLink>
                        <Link href={`/reviews/${bounty.id}/${submission.submission_id}`} className="mono text-[9px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">
                          ADJUDICATE / REVIEW →
                        </Link>
                      </div>
                      {verdict ? (
                        <div className={`verdict-card ${verdict.approved ? "verdict-approved" : "verdict-rejected"}`}>
                          <div className="flex flex-wrap justify-between gap-3">
                            <p className="mono text-[10px] tracking-[0.08em]">
                              {verdict.approved ? "APPROVED" : "NOT APPROVED"}
                              {verdict.outcome && <span className="ml-2 font-bold">({verdict.outcome})</span>}
                            </p>
                            <p className="mono text-[10px]">SCORE {verdict.score}/100</p>
                          </div>
                          <p className="mt-3 text-sm leading-6">{verdict.reason}</p>
                          {(() => {
                            const criteriaList = parseCriteriaResults(verdict.criteria_results);
                            return criteriaList.length > 0 ? (
                              <div className="mt-3 border-t border-current/15 pt-3">
                                <p className="mono text-[9px] tracking-[.08em] mb-2 font-medium">CRITERIA CONSENSUS RESULTS:</p>
                                <div className="flex flex-wrap gap-2">
                                  {criteriaList.map((res, idx) => (
                                    <span key={idx} className={`mono rounded px-2 py-0.5 text-[9px] font-bold ${
                                      res === "PASS"
                                        ? "bg-green-700/20 text-green-800"
                                        : res === "FAIL"
                                          ? "bg-red-700/20 text-red-800"
                                          : "bg-amber-700/20 text-amber-800"
                                    }`}>
                                      C{idx + 1}: {res}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          <p className="mt-3 border-t border-current/15 pt-3 text-sm leading-6 opacity-80">{verdict.criteria_report}</p>
                        </div>
                      ) : (
                        <p className="mono mt-4 text-[9px] tracking-[0.08em] text-[var(--muted-ink)]">NO FINALIZED VERDICT</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="md:col-span-5 space-y-8">
          <div className="border-t border-[var(--line)] pt-5">
            <SectionLabel>CASE STATE</SectionLabel>
            {status === "awarded" && <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">This bounty is settled. No further submissions or reviews can change its outcome.</p>}
            {status === "cancelled" && <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">The client cancelled this bounty before submissions were recorded; the escrow was returned.</p>}
            {status === "refunded" && <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">The review window expired without settlement; the escrow was returned to the client.</p>}
            {status === "open" && deadlinePassed && <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">The submission deadline has passed. Existing evidence may still be reviewed during the contract review window.</p>}
            {status === "open" && !deadlinePassed && !hasSubmitted && <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">This bounty is accepting public evidence until the deadline.</p>}
            {status === "open" && !deadlinePassed && hasSubmitted && <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">This bounty remains open. Submitted evidence can be reviewed; other builders may also submit before the deadline.</p>}

            {/* Actions for Builder */}
            {canSubmit && (
              <Link href={`/bounties/${bounty.id}/submit`} className="mt-5 inline-flex rounded-full bg-[var(--signal)] px-5 py-3 text-sm text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)]">
                Submit proof
              </Link>
            )}

            {/* Client Cancellation Action */}
            {canCancel && (
              <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
                <p className="mono text-[10px] tracking-[.1em] text-[var(--signal)]">CLIENT ACTION · ZERO SUBMISSIONS</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted-ink)]">As the client, you can cancel this bounty and receive a 100% refund of the {formatGen(bounty.reward)} GEN escrow because no submissions have been recorded.</p>
                <button
                  type="button"
                  disabled={actionState === "submitting"}
                  onClick={() => void handleCancelBounty()}
                  className="mt-4 rounded-full border border-[#db6b5e] bg-[#db6b5e]/10 px-4 py-2 text-xs font-medium text-[#b95046] transition hover:bg-[#db6b5e]/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {actionState === "submitting" ? "Awaiting wallet…" : "Cancel bounty & claim refund"}
                </button>
              </div>
            )}

            {/* Client Expired Refund Action */}
            {canRefundExpired && (
              <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
                <p className="mono text-[10px] tracking-[.1em] text-[var(--signal)]">CLIENT ACTION · EXPIRED REVIEW WINDOW</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted-ink)]">The 7-day review window after the deadline has expired without an awarded submission. You can reclaim your {formatGen(bounty.reward)} GEN escrow.</p>
                <button
                  type="button"
                  disabled={actionState === "submitting"}
                  onClick={() => void handleRefundExpiredBounty()}
                  className="mt-4 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--paper)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {actionState === "submitting" ? "Awaiting wallet…" : "Claim expired bounty refund"}
                </button>
              </div>
            )}

            {actionMessage && (
              <p className={`mono mt-3 text-[10px] tracking-[.06em] ${actionState === "error" ? "text-red-600" : "text-[var(--signal)]"}`} role="status">
                {actionMessage}
              </p>
            )}

            {actionTxHash && (
              <div className="mt-4">
                <TransactionLifecycle
                  hash={actionTxHash}
                  action={actionType === "cancel" ? "Bounty cancellation" : "Expired refund claim"}
                  onDismiss={() => {
                    setActionTxHash("");
                    void loadRecord();
                  }}
                  onStatusChange={(res) => {
                    if (res.done && !res.failed) {
                      void loadRecord();
                    }
                  }}
                />
              </div>
            )}

            {status === "open" && hasSubmitted && (
              <Link href="/reviews" className="mono mt-5 block text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">
                OPEN REVIEW DESK →
              </Link>
            )}
            <p className="mono mt-6 border-t border-[var(--line)] pt-4 text-[9px] leading-5 tracking-[0.04em] text-[var(--muted-ink)]">READ FROM FINALIZED STUDIONET STATE · CHAIN 61999</p>
          </div>

          {/* Financial Outcome Rules Disclosure (Item 24) */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5">
            <SectionLabel>FINANCIAL OUTCOME RULES</SectionLabel>
            <ul className="mt-3 space-y-3 text-xs leading-5 text-[var(--muted-ink)]">
              <li className="flex items-start gap-2">
                <span className="mono text-[10px] font-bold text-green-700">APPROVED:</span>
                <span>100% criteria pass validator consensus. Escrow reward transfers directly to builder address.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mono text-[10px] font-bold text-red-700">REJECTED:</span>
                <span>One or more criteria fail. Escrow remains safely in contract; other builders can submit.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mono text-[10px] font-bold text-amber-700">UNDETERMINED:</span>
                <span>External evidence temporary timeout/429. Submission remains pending and can be retried.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mono text-[10px] font-bold text-[var(--ink)]">CANCELLED:</span>
                <span>Client cancels an open case with 0 submissions. 100% of escrow is refunded immediately.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mono text-[10px] font-bold text-[var(--ink)]">REFUNDED:</span>
                <span>Deadline + 7-day review window expires with no award. Client reclaims 100% of escrow.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mono text-[10px] tracking-[0.1em] text-[var(--muted-ink)]">{children}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><SectionLabel>{label}</SectionLabel><p className="mt-2 text-sm">{value}</p></div>;
}

function EvidenceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="mono text-[9px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4">{children}</a>;
}