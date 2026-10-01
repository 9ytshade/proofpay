"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  checkContractVersionCompatibility,
  createProofPayClient,
  discoverFinalBounties,
  formatGen,
  genLayerTransactionUrl,
  proofPayContractAddress,
  readFinalContract,
  shortAddress,
} from "@/lib/genlayer";
import {
  getReviewTxMap,
  getUndeterminedReviews,
  markUndeterminedReview,
  saveReviewTx,
  type UndeterminedInfo,
} from "@/lib/safety";
import { TransactionLifecycle } from "@/components/transaction-lifecycle";

type Bounty = {
  id: number | string;
  title: string;
  reward: string;
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
  criteria_results?: string[];
  criteria_report: string;
  reason: string;
  evidence_note?: string;
};

type ReviewRecord = {
  bounty: Bounty;
  submission: Submission;
  verdict?: Verdict;
};

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

function getDisplayStatus(
  record: ReviewRecord,
  undeterminedMap: Record<string, UndeterminedInfo>,
): "submitted" | "approved" | "rejected" | "undetermined" | "net-failure" {
  if (record.submission.status === "approved" || record.verdict?.outcome === "APPROVED") return "approved";
  if (record.submission.status === "rejected" || record.verdict?.outcome === "REJECTED") return "rejected";
  if (record.verdict?.outcome === "UNDETERMINED" || record.submission.last_outcome === "UNDETERMINED") return "undetermined";
  const key = `${record.bounty.id}:${record.submission.submission_id}`;
  if (undeterminedMap[key]) return "net-failure";
  return "submitted";
}

export function ReviewDesk() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [undeterminedMap, setUndeterminedMap] = useState<
    Record<string, UndeterminedInfo>
  >(getUndeterminedReviews);
  const [reviewTxMap, setReviewTxMap] = useState<Record<string, string>>(
    getReviewTxMap,
  );
  const [copiedHash, setCopiedHash] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeTxHash, setActiveTxHash] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function copyTxHash(hash: string) {
    void navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    window.setTimeout(() => setCopiedHash(""), 2000);
  }

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const bountyReads = await discoverFinalBounties();
      const bounties = bountyReads.flatMap((read) =>
        isRecord(read, [
          "id",
          "title",
          "reward",
          "status",
          "submission_count",
          "approved_submission_id",
        ])
          ? [read as unknown as Bounty]
          : [],
      );
      const submissions = await Promise.allSettled(
        bounties.flatMap((bounty) =>
          Array.from(
            { length: Number(bounty.submission_count) },
            (_, index) => ({ bounty, submissionId: index + 1 }),
          ).map(async ({ bounty, submissionId }) => {
            const submission = await readFinalContract("get_submission", [
              Number(bounty.id),
              submissionId,
            ]);
            if (
              !isRecord(submission, [
                "submission_id",
                "builder",
                "status",
                "verdict_id",
              ])
            )
              return null;
            const typedSubmission = submission as unknown as Submission;
            let verdict: Verdict | undefined;
            if (Number(typedSubmission.verdict_id) > 0) {
              const result = await readFinalContract("get_verdict", [
                Number(typedSubmission.verdict_id),
              ]);
              if (
                isRecord(result, [
                  "approved",
                  "required_criteria_passed",
                  "score",
                  "criteria_report",
                  "reason",
                ])
              )
                verdict = result as unknown as Verdict;
            }
            return { bounty, submission: typedSubmission, verdict };
          }),
        ),
      );
      setRecords(
        submissions
          .flatMap((read) =>
            read.status === "fulfilled" && read.value ? [read.value] : [],
          )
          .sort((left, right) => Number(right.bounty.id) - Number(left.bounty.id)),
      );
    } catch {
      setError(
        "Could not load finalized submissions. Check your connection, then refresh.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  async function adjudicate(record: ReviewRecord) {
    const key = `${record.bounty.id}:${record.submission.submission_id}`;
    setActiveKey(key);
    setReviewing(key);
    setError("");
    setActiveTxHash("");
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
        args: [
          Number(record.bounty.id),
          Number(record.submission.submission_id),
        ],
        value: BigInt(0),
      });
      const hashString = String(hash);
      setActiveTxHash(hashString);
      saveReviewTx(
        record.bounty.id,
        record.submission.submission_id,
        hashString,
      );
      setReviewTxMap(getReviewTxMap());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The intelligent review could not be started.",
      );
    } finally {
      setReviewing("");
    }
  }

  const filteredRecords = records.filter((record) => {
    const displayStatus = getDisplayStatus(record, undeterminedMap);
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${record.bounty.title} ${record.submission.summary} ${record.submission.builder} case #${record.bounty.id} evidence #${record.submission.submission_id} ${displayStatus}`
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      statusFilter === "all" || displayStatus === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <section id="review" className="scroll-mt-8 py-20 md:py-28">
      <div className="grid gap-9 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="mono text-[10px] tracking-[.12em] text-[var(--signal)]">
            INTELLIGENT REVIEW DESK
          </p>
          <h2 className="mt-4 max-w-sm text-5xl leading-[.9] tracking-[-.06em] sm:text-6xl">
            Evidence in.<br />
            <span className="italic">Verdict out.</span>
          </h2>
          <p className="mt-5 max-w-sm leading-6 text-[var(--muted-ink)]">
            Anyone can start review of a submitted proof. GenLayer validators retrieve
            the public evidence, assess it against the brief, and settle escrow only
            when every requirement passes.
          </p>
          <div className="mt-8 border-l-2 border-[var(--signal)] pl-4">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">
              LIVE CONSENSUS
            </p>
            <p className="mt-2 text-sm leading-5">
              Starting a review creates a fee-bearing consensus transaction. The bounty
              reward is never sent by this action—it stays protected until an approved
              verdict.
            </p>
          </div>
        </div>

        <div className="space-y-4 md:col-span-8">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">
              FINALIZED SUBMISSION RECORDS
            </p>
            <button
              onClick={() => void loadRecords()}
              className="mono rounded-full border border-[var(--line)] px-3 py-1 text-[10px] tracking-[.08em] transition hover:border-[var(--ink)]"
            >
              REFRESH
            </button>
          </div>

          {/* Search and Status Filter */}
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_13rem]">
            <label className="sr-only" htmlFor="review-search">
              Search submission records
            </label>
            <input
              id="review-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles, summaries, builders, or IDs"
              className="min-w-0 border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-ink)] focus:border-[var(--signal)]"
            />
            <label className="sr-only" htmlFor="review-status">
              Filter by submission status
            </label>
            <select
              id="review-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--signal)]"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted (awaiting review)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="undetermined">Undetermined</option>
            </select>
          </div>

          {loading && (
            <p className="py-8 text-[var(--muted-ink)]">
              Loading finalized evidence records…
            </p>
          )}
          {error && <p className="creator-message creator-message-error">{error}</p>}
          {!loading && !records.length && !error && (
            <p className="py-8 text-[var(--muted-ink)]">
              No submissions exist for the configured bounty records.
            </p>
          )}
          {!loading && records.length > 0 && filteredRecords.length === 0 && (
            <p className="py-8 text-[var(--muted-ink)]">
              No matching submission records found. Try another search or status filter.
            </p>
          )}

          {filteredRecords.map((record) => {
            const recordKey = `${record.bounty.id}:${record.submission.submission_id}`;
            const isThisActive = activeKey === recordKey && Boolean(activeTxHash);
            const undeterminedInfo = undeterminedMap[recordKey];
            const reviewTx = reviewTxMap[recordKey] || undeterminedInfo?.txHash;

            return (
              <div key={recordKey} className="space-y-3">
                <ReviewCard
                  record={record}
                  reviewing={reviewing === recordKey}
                  undeterminedInfo={undeterminedInfo}
                  reviewTxHash={reviewTx}
                  copiedHash={copiedHash}
                  onCopyHash={copyTxHash}
                  onAdjudicate={() => void adjudicate(record)}
                />

                {/* Inline Live Consensus Tracker directly under the card being reviewed */}
                {isThisActive && (
                  <div className="rounded-xl border-l-4 border-[var(--signal)] bg-[var(--paper)] p-4 shadow-[3px_3px_0_var(--line)]">
                    <p className="mono text-[10px] tracking-[.08em] text-[var(--signal)]">
                      LIVE CONSENSUS REVIEW · CASE #{record.bounty.id} · EVIDENCE #{record.submission.submission_id}
                    </p>
                    <TransactionLifecycle
                      hash={activeTxHash}
                      action="Intelligent review"
                      reviewContext={{
                        bountyId: record.bounty.id,
                        submissionId: record.submission.submission_id,
                        bountyReward: record.bounty.reward,
                      }}
                      onStatusChange={(status) => {
                        if (status.done) {
                          if (status.failed) {
                            markUndeterminedReview(
                              record.bounty.id,
                              record.submission.submission_id,
                              status.errorReason ||
                                "Evidence could not be retrieved by GenLayer validators (HTTP error or unreachable URL).",
                              activeTxHash,
                            );
                            setUndeterminedMap(getUndeterminedReviews());
                          }
                          // Refresh records so the card immediately displays the finalized verdict
                          void loadRecords();
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({
  record,
  reviewing,
  undeterminedInfo,
  reviewTxHash,
  copiedHash,
  onCopyHash,
  onAdjudicate,
}: {
  record: ReviewRecord;
  reviewing: boolean;
  undeterminedInfo?: UndeterminedInfo;
  reviewTxHash?: string;
  copiedHash?: string;
  onCopyHash: (hash: string) => void;
  onAdjudicate: () => void;
}) {
  const { bounty, submission, verdict } = record;
  const isApproved = submission.status === "approved" || verdict?.outcome === "APPROVED";
  const isRejected = submission.status === "rejected" || verdict?.outcome === "REJECTED";
  const isApplicationUndetermined = verdict?.outcome === "UNDETERMINED" || submission.last_outcome === "UNDETERMINED";
  const isNetworkUndetermined = !isApproved && !isRejected && !isApplicationUndetermined && Boolean(undeterminedInfo);
  const isSubmitted = !isApproved && !isRejected && !isApplicationUndetermined && !isNetworkUndetermined;
  const paths = submission.evidence_paths
    ? submission.evidence_paths.split("\n").map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <article
      className={`review-card ${
        isApproved
          ? "review-approved"
          : isRejected
            ? "review-rejected"
            : isApplicationUndetermined
              ? "border-[#e09138]/60 bg-[var(--card)]"
              : isNetworkUndetermined
                ? "border-[#db6b5e]/60 bg-[var(--card)]"
                : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mono text-[10px] tracking-[.1em]">
          CASE #{bounty.id} · EVIDENCE #{submission.submission_id}
          {submission.commit_sha && (
            <span className="ml-2 font-mono text-[var(--muted-ink)]">
              ({submission.commit_sha.slice(0, 8)}…)
            </span>
          )}
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
      <h3 className="mt-4 text-3xl leading-[.95] tracking-[-.05em]">
        {bounty.title}
      </h3>
      <div className="mt-5 grid gap-3 border-y border-[var(--line)] py-4 sm:grid-cols-3">
        <Metric label="ESCROW" value={`${formatGen(bounty.reward)} GEN`} />
        <Metric label="BUILDER" value={shortAddress(submission.builder)} />
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
      </div>
      <p className="mt-5 text-sm leading-6 text-[var(--muted-ink)]">
        {submission.summary}
      </p>

      {paths.length > 0 && (
        <div className="mt-3">
          <p className="mono text-[9px] tracking-[.08em] text-[var(--muted-ink)]">
            EVIDENCE PATHS ({paths.length}):
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {paths.map((path) => (
              <span key={path} className="mono rounded border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-[10px] text-[var(--ink)]">
                {path}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={submission.repository_url}
          target="_blank"
          rel="noreferrer"
          className="mono text-[10px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4"
        >
          VIEW SOURCE COMMIT ↗
        </a>
        <a
          href={submission.deployment_url}
          target="_blank"
          rel="noreferrer"
          className="mono text-[10px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4"
        >
          VIEW DEPLOYMENT ↗
        </a>
        <Link
          href={`/reviews/${bounty.id}/${submission.submission_id}`}
          className="mono text-[10px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4"
        >
          VIEW FULL REVIEW →
        </Link>
      </div>

      {/* Application Undetermined Callout */}
      {isApplicationUndetermined && (
        <div className="mt-4 rounded-lg border-l-2 border-[#e09138] bg-[#e09138]/10 p-3">
          <p className="mono text-[10px] tracking-[.1em] text-[#c27623]">
            APPLICATION VERDICT: UNDETERMINED · RETRYABLE ON-CHAIN
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink)]">
            {verdict?.reason || "External evidence returned transient errors during validator retrieval."}
          </p>
          <p className="mt-2 text-[11px] leading-4 text-[var(--muted-ink)]">
            Escrow remains locked. The submission remains eligible for review retry.
          </p>
        </div>
      )}

      {/* Network Undetermined Callout */}
      {isNetworkUndetermined && undeterminedInfo && (
        <div className="mt-4 rounded-lg border-l-2 border-[#db6b5e] bg-[#db6b5e]/10 p-3">
          <p className="mono text-[10px] tracking-[.1em] text-[#b95046]">
            TRANSACTION REVERTED OR NETWORK TIMEOUT
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink)]">
            {undeterminedInfo.reason}
          </p>
          <p className="mt-2 text-[11px] leading-4 text-[var(--muted-ink)]">
            Consensus transaction failed to reach finality. On-chain state was not modified.
          </p>
        </div>
      )}

      {verdict && (
        <div
          className={`verdict-card ${
            verdict.approved ? "verdict-approved" : "verdict-rejected"
          }`}
        >
          <div className="flex flex-wrap justify-between gap-3">
            <p className="mono text-[10px] tracking-[.1em]">
              {verdict.approved
                ? "APPROVED · REWARD SETTLED"
                : isApplicationUndetermined
                  ? "UNDETERMINED · ESCROW UNCHANGED"
                  : "NOT APPROVED · ESCROW REMAINS OPEN"}
            </p>
            {verdict.outcome && <span className="mono text-[10px] font-bold">({verdict.outcome})</span>}
          </div>
          <p className="mt-3 text-sm leading-6">{verdict.reason}</p>
          {verdict.criteria_results && verdict.criteria_results.length > 0 && (
            <div className="mt-3 border-t border-current/15 pt-3">
              <p className="mono text-[9px] tracking-[.08em] mb-1.5 font-medium">CRITERIA CONSENSUS RESULTS:</p>
              <div className="flex flex-wrap gap-1.5">
                {verdict.criteria_results.map((res, idx) => (
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
          )}
          <p className="mt-3 border-t border-current/15 pt-3 text-sm leading-6 opacity-80">
            {verdict.criteria_report}
          </p>
        </div>
      )}

      {/* Review Transaction ID & Explorer link on reviewed / undetermined cards */}
      {reviewTxHash && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted-ink)]">
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] tracking-[.08em] text-[var(--muted-ink)]">
              REVIEW TX:
            </span>
            <span className="mono font-mono text-[11px] text-[var(--ink)]">
              {shortHash(reviewTxHash)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onCopyHash(reviewTxHash)}
              className="mono text-[10px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
            >
              {copiedHash === reviewTxHash
                ? "COPIED TRANSACTION ID"
                : "COPY TRANSACTION ID"}
            </button>
            <a
              href={genLayerTransactionUrl(reviewTxHash)}
              target="_blank"
              rel="noreferrer"
              className="mono text-[10px] tracking-[.08em] text-[var(--signal)] underline decoration-[var(--signal)] underline-offset-4"
            >
              VIEW ON EXPLORER ↗
            </a>
          </div>
        </div>
      )}

      {(isSubmitted || isApplicationUndetermined || isNetworkUndetermined) && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
          <p className="max-w-sm text-sm leading-5 text-[var(--muted-ink)]">
            {isApplicationUndetermined
              ? "On-chain evaluation was undetermined. You may retry adjudication."
              : isNetworkUndetermined
                ? "Network transaction timed out or reverted. You can re-send the review."
                : "This starts GenLayer’s public-evidence evaluation. It may use fee balance and can take several consensus phases."}
          </p>
          <button
            onClick={onAdjudicate}
            disabled={reviewing}
            className={`rounded-full px-5 py-3 text-sm text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${
              isApplicationUndetermined
                ? "bg-[#c27623] hover:bg-[#a5621a]"
                : isNetworkUndetermined
                  ? "bg-[#db6b5e] hover:bg-[#b95046]"
                  : "bg-[var(--signal)]"
            }`}
          >
            {reviewing
              ? "Opening wallet…"
              : isApplicationUndetermined
                ? "Retry review"
                : isNetworkUndetermined
                  ? "Re-send review"
                  : "Start intelligent review"}
          </button>
        </div>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mono text-[9px] tracking-[.1em] text-[var(--muted-ink)]">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
