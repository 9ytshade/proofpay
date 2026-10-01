"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  checkContractVersionCompatibility,
  createProofPayClient,
  formatGen,
  proofPayContractAddress,
  readFinalContract,
  shortAddress,
} from "@/lib/genlayer";
import {
  getUndeterminedReviews,
  markUndeterminedReview,
  type UndeterminedInfo,
} from "@/lib/safety";
import { TransactionLifecycle } from "@/components/transaction-lifecycle";

type Bounty = {
  id: number | string;
  title: string;
  brief: string;
  criteria: string;
  reward: string;
  status: string;
  submission_count: number | string;
  approved_submission_id: number | string;
  client: string;
  deadline: number | string;
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
  criteria_results?: string[];
  criteria_report: string;
  reason: string;
  evidence_note?: string;
};

type LoadState = "loading" | "ready" | "error";

function isRecord(value: unknown, keys: string[]) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !keys.some((key) => (value as Record<string, unknown>)[key] === undefined)
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function ReviewRecord() {
  const params = useParams<{ bountyId: string; submissionId: string }>();
  const bountyId = Number(params.bountyId);
  const submissionId = Number(params.submissionId);

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [undeterminedMap, setUndeterminedMap] = useState<
    Record<string, UndeterminedInfo>
  >(getUndeterminedReviews);
  const [state, setState] = useState<LoadState>("loading");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  const loadRecord = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [rawBounty, rawSubmission] = await Promise.all([
        readFinalContract("get_bounty", [bountyId]),
        readFinalContract("get_submission", [bountyId, submissionId]),
      ]);

      if (
        !isRecord(rawBounty, [
          "id",
          "title",
          "brief",
          "reward",
          "status",
          "client",
        ]) ||
        !isRecord(rawSubmission, [
          "bounty_id",
          "submission_id",
          "builder",
          "repository_url",
          "deployment_url",
          "summary",
          "status",
        ])
      ) {
        throw new Error("Record not found");
      }

      const typedBounty = rawBounty as unknown as Bounty;
      const typedSubmission = rawSubmission as unknown as Submission;

      setBounty(typedBounty);
      setSubmission(typedSubmission);

      if (Number(typedSubmission.verdict_id) > 0) {
        const rawVerdict = await readFinalContract("get_verdict", [
          Number(typedSubmission.verdict_id),
        ]);
        if (
          isRecord(rawVerdict, [
            "approved",
            "score",
            "reason",
            "criteria_report",
          ])
        ) {
          setVerdict(rawVerdict as unknown as Verdict);
        }
      } else {
        setVerdict(null);
      }

      setState("ready");
    } catch {
      setBounty(null);
      setSubmission(null);
      setVerdict(null);
      setState("error");
    }
  }, [bountyId, submissionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecord(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecord]);

  async function adjudicate() {
    setReviewing(true);
    setError("");
    setTransactionHash("");
    try {
      if (!window.ethereum)
        throw new Error("Install or unlock MetaMask before starting the review.");
      const versionCheck = await checkContractVersionCompatibility();
      if (!versionCheck.compatible) {
        throw new Error(versionCheck.error ?? "The contract version is incompatible with ProofPay v2.");
      }
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const address =
        Array.isArray(accounts) && typeof accounts[0] === "string"
          ? accounts[0]
          : undefined;
      if (!address) throw new Error("Connect a wallet from the header first.");
      const hash = await createProofPayClient(
        address as `0x${string}`,
      ).writeContract({
        address: proofPayContractAddress as `0x${string}`,
        functionName: "adjudicate_submission",
        args: [bountyId, submissionId],
        value: BigInt(0),
      });
      setTransactionHash(String(hash));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The intelligent review could not be started.",
      );
    } finally {
      setReviewing(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="py-16 text-[var(--muted-ink)]" role="status">
        Loading finalized review record…
      </div>
    );
  }

  if (state === "error" || !bounty || !submission) {
    return (
      <div className="py-16" role="alert">
        <p className="text-2xl tracking-[-0.04em]">This review record is unavailable.</p>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          It may not exist on the configured Studionet contract, or the finalized
          record could not be read.
        </p>
        <button
          type="button"
          onClick={() => void loadRecord()}
          className="mono mt-5 text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4"
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  const isApproved = submission.status === "approved" || verdict?.outcome === "APPROVED";
  const isRejected = submission.status === "rejected" || verdict?.outcome === "REJECTED";
  const isApplicationUndetermined = verdict?.outcome === "UNDETERMINED" || submission.last_outcome === "UNDETERMINED";
  const undeterminedInfo = undeterminedMap[`${bountyId}:${submissionId}`];
  const isNetworkUndetermined = !isApproved && !isRejected && !isApplicationUndetermined && Boolean(undeterminedInfo);
  const isSubmitted = !isApproved && !isRejected && !isApplicationUndetermined && !isNetworkUndetermined;

  const paths = submission.evidence_paths
    ? submission.evidence_paths.split("\n").map((p) => p.trim()).filter(Boolean)
    : [];
  const shortSha = submission.commit_sha
    ? `${submission.commit_sha.slice(0, 10)}…`
    : null;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/reviews"
            className="mono text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4"
          >
            ← ALL REVIEWS
          </Link>
          <Link
            href={`/bounties/${bountyId}`}
            className="mono text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4"
          >
            VIEW BOUNTY #{bountyId}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void loadRecord()}
          className="mono rounded-full border border-[var(--line)] px-3 py-2 text-[10px] tracking-[0.08em] transition hover:border-[var(--ink)]"
        >
          REFRESH RECORD
        </button>
      </div>

      <header className="border-b border-[var(--line)] pb-8 sm:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono text-[10px] tracking-[0.12em] text-[var(--signal)]">
            CASE #{bountyId} · EVIDENCE #{submissionId}
          </p>
          <span
            className={`mono rounded-full px-3 py-1 text-[10px] tracking-[0.08em] ${
              isApproved
                ? "bg-[color-mix(in_srgb,var(--verdict)_70%,var(--paper))] text-[var(--ink)]"
                : isRejected
                  ? "bg-[color-mix(in_srgb,#db6b5e_14%,var(--paper))] text-[#b95046]"
                  : isApplicationUndetermined
                    ? "bg-[#e09138]/20 font-medium text-[#c27623]"
                    : isNetworkUndetermined
                      ? "bg-[#db6b5e]/15 font-medium text-[#b95046]"
                      : "border border-[var(--line)]"
            }`}
          >
            {isApproved
              ? "APPROVED"
              : isRejected
                ? "REJECTED"
                : isApplicationUndetermined
                  ? "UNDETERMINED (ON-CHAIN)"
                  : isNetworkUndetermined
                    ? "UNDETERMINED (NETWORK)"
                    : submission.status.toUpperCase()}
          </span>
        </div>
        <h1 className="mt-5 max-w-5xl text-5xl leading-[0.9] tracking-[-0.06em] sm:text-7xl">
          {bounty.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-[var(--muted-ink)]">
          {bounty.brief}
        </p>
      </header>

      <section
        className="grid gap-5 border-b border-[var(--line)] py-6 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Review summary"
      >
        <Metric label="ESCROW" value={`${formatGen(bounty.reward)} GEN`} />
        <Metric label="BUILDER" value={shortAddress(submission.builder)} />
        <Metric
          label="STATUS"
          value={
            isApproved
              ? "APPROVED"
              : isRejected
                ? "REJECTED"
                : isApplicationUndetermined
                  ? "UNDETERMINED"
                  : isNetworkUndetermined
                    ? "NET FAIL"
                    : submission.status.toUpperCase()
          }
        />
        <Metric
          label="SCORE"
          value={
            verdict
              ? `${verdict.score}/100`
              : isApplicationUndetermined
                ? "Undetermined"
                : "Awaiting review"
          }
        />
        <Metric
          label="REVIEWS"
          value={submission.review_count !== undefined ? String(submission.review_count) : "0"}
        />
      </section>

      <div className="grid gap-12 py-10 md:grid-cols-12 md:gap-16">
        <div className="space-y-10 md:col-span-7">
          <section>
            <SectionLabel>BUILDER SUMMARY</SectionLabel>
            <p className="mt-4 leading-6">{submission.summary}</p>
          </section>

          <section>
            <SectionLabel>IMMUTABLE SOURCE & DEPLOYMENT</SectionLabel>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="mono text-[10px] text-[var(--muted-ink)]">COMMIT PERMALINK:</span>
                <a
                  href={submission.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono break-all text-[11px] text-[var(--signal)] underline underline-offset-4"
                >
                  {submission.repository_url}
                </a>
              </div>
              {submission.commit_sha && (
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="mono text-[10px] text-[var(--muted-ink)]">COMMIT SHA:</span>
                  <span className="mono font-mono text-[11px] text-[var(--ink)]">
                    {submission.commit_sha}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="mono text-[10px] text-[var(--muted-ink)]">LIVE DEPLOYMENT:</span>
                <a
                  href={submission.deployment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono break-all text-[11px] text-[var(--signal)] underline underline-offset-4"
                >
                  {submission.deployment_url}
                </a>
              </div>
            </div>

            {paths.length > 0 && (
              <div className="mt-4">
                <SectionLabel>BOUNDED EVIDENCE PATHS ({paths.length})</SectionLabel>
                <p className="mt-1 text-xs text-[var(--muted-ink)]">
                  Evaluated at raw.githubusercontent.com pinned to commit {shortSha ?? "SHA"}.
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {paths.map((path) => (
                    <li
                      key={path}
                      className="mono rounded border border-[var(--line)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--ink)]"
                    >
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Application-level Undetermined Callout */}
          {isApplicationUndetermined && (
            <section>
              <div className="rounded-lg border-l-2 border-[#e09138] bg-[#e09138]/10 p-4">
                <p className="mono text-[10px] tracking-[.1em] text-[#c27623]">
                  APPLICATION VERDICT: UNDETERMINED · RETRYABLE ON-CHAIN STATE
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
                  {verdict?.reason ||
                    "External evidence was temporarily unreachable or returned transient errors (e.g. HTTP 429/5xx)."}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--muted-ink)]">
                  This is finalized on-chain application state. Escrow remains safely locked, and the submission remains open for review retry.
                </p>
              </div>
            </section>
          )}

          {/* Network-level Undetermined Callout */}
          {isNetworkUndetermined && undeterminedInfo && (
            <section>
              <div className="rounded-lg border-l-2 border-[#db6b5e] bg-[#db6b5e]/10 p-4">
                <p className="mono text-[10px] tracking-[.1em] text-[#b95046]">
                  TRANSACTION REVERTED OR NETWORK TIMEOUT
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
                  {undeterminedInfo.reason}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--muted-ink)]">
                  The consensus transaction itself failed to reach finality. On-chain contract state was not modified. You can re-send the adjudication transaction.
                </p>
              </div>
            </section>
          )}

          {verdict && (
            <section>
              <SectionLabel>FINALIZED VERDICT</SectionLabel>
              <div
                className={`mt-4 verdict-card ${
                  verdict.approved ? "verdict-approved" : "verdict-rejected"
                }`}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="mono text-[10px] tracking-[0.08em]">
                    {verdict.approved ? "APPROVED" : "NOT APPROVED"}
                    {verdict.outcome && <span className="ml-2 font-bold">({verdict.outcome})</span>}
                  </p>
                  <p className="mono text-[10px]">SCORE {verdict.score}/100</p>
                </div>
                <p className="mt-3 text-sm leading-6">{verdict.reason}</p>

                {verdict.criteria_results && verdict.criteria_results.length > 0 && (
                  <div className="mt-3 border-t border-current/15 pt-3">
                    <p className="mono text-[9px] tracking-[.08em] mb-2 font-medium">
                      CRITERIA CONSENSUS RESULTS:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {verdict.criteria_results.map((res, idx) => (
                        <span
                          key={idx}
                          className={`mono rounded px-2 py-0.5 text-[9px] font-bold ${
                            res === "PASS"
                              ? "bg-green-700/20 text-green-800"
                              : res === "FAIL"
                                ? "bg-red-700/20 text-red-800"
                                : "bg-amber-700/20 text-amber-800"
                          }`}
                        >
                          C{idx + 1}: {res}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-3 border-t border-current/15 pt-3 text-sm leading-6 opacity-80">
                  {verdict.criteria_report}
                </p>
                {verdict.evidence_note && (
                  <p className="mt-2 text-xs italic text-[var(--muted-ink)]">
                    Note: {verdict.evidence_note}
                  </p>
                )}
              </div>
            </section>
          )}

          {error && <p className="creator-message creator-message-error">{error}</p>}
          {transactionHash && (
            <div>
              <p className="mono mt-5 text-[10px] tracking-[.08em] text-[var(--muted-ink)]">
                REVIEW TRANSACTION {shortHash(transactionHash)}
              </p>
              <TransactionLifecycle
                hash={transactionHash}
                action="Intelligent review"
                reviewContext={{
                  bountyId,
                  submissionId,
                  bountyReward: bounty.reward,
                }}
                onStatusChange={(status) => {
                  if (status.done) {
                    if (status.failed) {
                      markUndeterminedReview(
                        bountyId,
                        submissionId,
                        status.errorReason ||
                          "Consensus transaction failed or validator timed out.",
                        transactionHash,
                      );
                      setUndeterminedMap(getUndeterminedReviews());
                    }
                    void loadRecord();
                  }
                }}
              />
            </div>
          )}
        </div>

        <aside className="md:col-span-5">
          <div className="border-t border-[var(--line)] pt-5">
            <SectionLabel>REVIEW STATE</SectionLabel>
            {isApproved && (
              <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
                This submission was approved. The builder received the escrowed reward.
              </p>
            )}
            {isRejected && (
              <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
                This submission was not approved. The bounty escrow remains open for other submissions.
              </p>
            )}
            {isApplicationUndetermined && (
              <>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
                  This review returned an on-chain UNDETERMINED outcome due to transient evidence issues. You can retry the review.
                </p>
                <button
                  onClick={() => void adjudicate()}
                  disabled={reviewing}
                  className="mt-5 inline-flex rounded-full bg-[#c27623] px-5 py-3 text-sm text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[#a5621a] disabled:cursor-wait disabled:opacity-60"
                >
                  {reviewing ? "Opening wallet…" : "Retry intelligent review"}
                </button>
              </>
            )}
            {isNetworkUndetermined && (
              <>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
                  The last consensus transaction did not reach finality. You can re-send the review transaction.
                </p>
                <button
                  onClick={() => void adjudicate()}
                  disabled={reviewing}
                  className="mt-5 inline-flex rounded-full bg-[#db6b5e] px-5 py-3 text-sm text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[#b95046] disabled:cursor-wait disabled:opacity-60"
                >
                  {reviewing ? "Opening wallet…" : "Re-send review transaction"}
                </button>
              </>
            )}
            {isSubmitted && (
              <>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
                  This submission is awaiting intelligent review. Anyone can start the adjudication process.
                </p>
                <button
                  onClick={() => void adjudicate()}
                  disabled={reviewing}
                  className="mt-5 inline-flex rounded-full bg-[var(--signal)] px-5 py-3 text-sm text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                >
                  {reviewing ? "Opening wallet…" : "Start intelligent review"}
                </button>
              </>
            )}
            {!isSubmitted && !verdict && !isApplicationUndetermined && !isNetworkUndetermined && (
              <p className="mono mt-4 text-[9px] tracking-[0.08em] text-[var(--muted-ink)]">
                NO FINALIZED VERDICT
              </p>
            )}
            <p className="mono mt-6 border-t border-[var(--line)] pt-4 text-[9px] leading-5 tracking-[0.04em] text-[var(--muted-ink)]">
              READ FROM FINALIZED STUDIONET STATE · CHAIN 61999
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono text-[10px] tracking-[0.1em] text-[var(--muted-ink)]">
      {children}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}
