"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createProofPayClient,
  formatGen,
  genLayerTransactionUrl,
  readFinalContract,
  shortAddress,
} from "@/lib/genlayer";
import type { Hash } from "genlayer-js/types";

export type ReviewContext = {
  bountyId: number | string;
  submissionId: number | string;
  bountyReward?: string;
};

export type AdjudicationResult = {
  approved: boolean;
  score: number | string;
  reason: string;
  criteria_report: string;
  builder?: string;
};

type LifecycleState = {
  status: string;
  result?: string;
  detail: string;
  errorReason?: string;
  done: boolean;
  failed: boolean;
};

const initialState: LifecycleState = {
  status: "PENDING",
  detail: "Transaction submitted. Waiting for the ProofPay network record.",
  done: false,
  failed: false,
};

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function extractContractError(tx: Record<string, unknown>): { isError: boolean; message?: string } {
  const consensusData = tx.consensus_data as Record<string, unknown> | undefined;

  // GenLayer Studionet consensus data stores leader execution receipts
  if (consensusData && Array.isArray(consensusData.leader_receipt) && consensusData.leader_receipt.length > 0) {
    const leader = consensusData.leader_receipt[0] as Record<string, unknown>;
    const executionResult = String(leader.execution_result ?? "").toUpperCase();
    const resultObj = leader.result as Record<string, unknown> | string | undefined;

    let payloadMessage: string | undefined;
    let isRollback = false;

    if (resultObj && typeof resultObj === "object") {
      if (resultObj.status === "rollback") isRollback = true;
      if (typeof resultObj.payload === "string" && resultObj.payload) {
        payloadMessage = resultObj.payload;
      }
    } else if (typeof resultObj === "string") {
      try {
        const decoded = atob(resultObj);
        if (decoded.charCodeAt(0) === 1) {
          isRollback = true;
          payloadMessage = decoded.slice(1).replace(/[^\x20-\x7E\s]/g, "").trim();
        }
      } catch {
        // base64 decode failed
      }
    }

    if (executionResult === "ERROR" || isRollback) {
      return {
        isError: true,
        message: payloadMessage || "The smart contract reverted execution.",
      };
    }
  }

  // Fallback checks for direct VM results or error messages
  if (typeof tx.errorMessage === "string" && tx.errorMessage) {
    return { isError: true, message: tx.errorMessage };
  }

  if (tx.data && typeof tx.data === "object") {
    const data = tx.data as Record<string, unknown>;
    if (typeof data.error === "string" && data.error) return { isError: true, message: data.error };
    if (typeof data.message === "string" && data.message) return { isError: true, message: data.message };
  }

  if (String(tx.txExecutionResultName ?? "") === "FINISHED_WITH_ERROR" || Number(tx.txExecutionResult) === 2) {
    return {
      isError: true,
      message: "Contract execution finished with error.",
    };
  }

  if (String(tx.resultName ?? "") === "FAILURE" || tx.result === 1) {
    return {
      isError: true,
      message: "Transaction failed consensus validation.",
    };
  }

  return { isError: false };
}

function describe(transaction: Record<string, unknown>): LifecycleState {
  const statusRaw = String(transaction.statusName ?? transaction.status ?? "PENDING");
  const normalized = statusRaw || "PENDING";
  const resultRaw = transaction.resultName ? String(transaction.resultName) : undefined;

  const errorInfo = extractContractError(transaction);
  const isTerminalError = ["UNDETERMINED", "CANCELED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(normalized);
  const failed = isTerminalError || (normalized === "FINALIZED" && errorInfo.isError);

  const errorReason = errorInfo.message;

  const detailByStatus: Record<string, string> = {
    UNINITIALIZED: "Transaction is being registered by the network.",
    PENDING: "Transaction is queued for validator processing.",
    PROPOSING: "A leader is proposing the transaction result.",
    COMMITTING: "Validators are committing their consensus votes.",
    REVEALING: "Validators are revealing and checking the result.",
    APPEAL_COMMITTING: "An appeal round is committing validator votes.",
    APPEAL_REVEALING: "An appeal round is revealing validator votes.",
    READY_TO_FINALIZE: "Consensus is decided. The network is finalizing the state change.",
    ACCEPTED: "Consensus accepted the transaction. Waiting for finality.",
    FINALIZED: failed
      ? errorReason
        ? `Execution reverted: ${errorReason}`
        : "The transaction finalized, but the contract reverted during execution."
      : "Finalized. ProofPay state is now a durable public record.",
    UNDETERMINED: "The network could not reach a final result. Review the transaction before retrying.",
    CANCELED: "This transaction was canceled before finality.",
    VALIDATORS_TIMEOUT: "Validators timed out. Review the transaction before retrying.",
    LEADER_TIMEOUT: "The leader timed out. Review the transaction before retrying.",
  };

  return {
    status: normalized,
    result: resultRaw,
    detail: detailByStatus[normalized] ?? "The transaction is progressing through GenLayer consensus.",
    errorReason,
    done: normalized === "FINALIZED" || failed,
    failed,
  };
}

export function TransactionLifecycle({
  hash,
  action,
  reviewContext,
  onDismiss,
  onStatusChange,
}: {
  hash: string;
  action: string;
  reviewContext?: ReviewContext;
  onDismiss?: () => void;
  onStatusChange?: (status: { done: boolean; failed: boolean; errorReason?: string }) => void;
}) {
  const [lifecycle, setLifecycle] = useState<LifecycleState>(initialState);
  const [adjudication, setAdjudication] = useState<AdjudicationResult | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasPromptedModal, setHasPromptedModal] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const transaction = await createProofPayClient().getTransaction({ hash: hash as Hash });
      const next = describe(transaction as unknown as Record<string, unknown>);
      setLifecycle(next);
      setLastUpdated(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );

      // If this is an intelligent review and it succeeded on-chain, fetch the verdict details
      if (next.done && !next.failed && reviewContext && !adjudication) {
        try {
          const sub = (await readFinalContract("get_submission", [
            Number(reviewContext.bountyId),
            Number(reviewContext.submissionId),
          ])) as Record<string, unknown>;

          if (sub) {
            const verdictId = Number(sub.verdict_id ?? 0);
            if (verdictId > 0) {
              const verdictData = (await readFinalContract("get_verdict", [
                verdictId,
              ])) as Record<string, unknown>;

              if (verdictData) {
                setAdjudication({
                  approved: Boolean(verdictData.approved),
                  score: Number(verdictData.score ?? 0),
                  reason: String(verdictData.reason ?? ""),
                  criteria_report: String(verdictData.criteria_report ?? ""),
                  builder: sub.builder ? String(sub.builder) : undefined,
                });
              }
            }
          }
        } catch {
          // Verdict read fallback
        }
      }

      onStatusChange?.({ done: next.done, failed: next.failed, errorReason: next.errorReason });

      // Auto-open modal upon reaching final state for the first time
      if (next.done && !hasPromptedModal) {
        setModalOpen(true);
        setHasPromptedModal(true);
      }
    } catch {
      setLifecycle((current) => ({
        ...current,
        detail: "The transaction is submitted. We will retry its network status shortly.",
      }));
    }
  }, [hash, hasPromptedModal, onStatusChange, reviewContext, adjudication]);

  useEffect(() => {
    const initialPoll = window.setTimeout(() => void refresh(), 0);
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => {
      window.clearTimeout(initialPoll);
      window.clearInterval(poll);
    };
  }, [refresh]);

  async function copyHash() {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function getHelpfulHint(reason?: string) {
    if (!reason) return null;
    const lower = reason.toLowerCase();
    if (lower.includes("repository evidence could not be retrieved") || lower.includes("deployment evidence could not be retrieved")) {
      return "The evidence URL returned an HTTP error (such as 404 Not Found) or was unreachable. Check that the repository commit and live deployment are public and live.";
    }
    if (lower.includes("https") || lower.includes("url")) {
      return "Make sure the deployment URL begins with https:// and includes a trailing slash (e.g. https://example.com/).";
    }
    if (lower.includes("client") || lower.includes("own bounty")) {
      return "Switch wallets: The creator of a bounty cannot submit evidence to their own bounty.";
    }
    if (lower.includes("deadline")) {
      return "The submission deadline for this bounty has already passed.";
    }
    return null;
  }

  const hint = getHelpfulHint(lifecycle.errorReason);

  return (
    <>
      <div
        className={`lifecycle ${
          lifecycle.failed
            ? "lifecycle-failed"
            : lifecycle.done
              ? "lifecycle-final"
              : ""
        }`}
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="mono text-[10px] tracking-[.1em]">
            {action.toUpperCase()} ·{" "}
            {lifecycle.failed
              ? "FINALIZED · REVERTED"
              : lifecycle.status.replaceAll("_", " ")}
          </p>
          <div className="flex items-center gap-2">
            {lifecycle.done && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mono text-[9px] tracking-[.08em] underline decoration-[var(--signal)] underline-offset-4"
              >
                VIEW OUTCOME
              </button>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="mono text-[9px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4"
            >
              REFRESH
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="lifecycle-dot" aria-hidden="true" />
          <p className="text-sm leading-5">{lifecycle.detail}</p>
        </div>

        {lifecycle.result && (
          <p className="mono mt-2 text-[9px] tracking-[.08em] text-[var(--muted-ink)]">
            CONSENSUS RESULT · {lifecycle.result}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => void copyHash()}
            className="mono text-[9px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4"
          >
            {copied ? "COPIED TRANSACTION ID" : "COPY TRANSACTION ID"}
          </button>
          <a
            href={genLayerTransactionUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="mono text-[9px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4"
          >
            VIEW TRANSACTION ↗
          </a>
        </div>

        {lastUpdated && (
          <p className="mono mt-2 text-[9px] tracking-[.08em] text-[var(--muted-ink)]">
            LAST CHECK · {lastUpdated} · AUTO-REFRESHES EVERY 5S
          </p>
        )}
      </div>

      {/* Finalization Outcome Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#101714]/70 p-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-modal-title"
        >
          <div
            className={`relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border bg-[var(--paper)] p-6 shadow-[-10px_12px_0_var(--ink)] sm:p-8 ${
              lifecycle.failed
                ? "border-[#db6b5e]"
                : adjudication && !adjudication.approved
                  ? "border-[#e09138]"
                  : "border-[var(--verdict)]"
            }`}
          >
            {/* Top row: badge & close button */}
            <div className="flex items-center justify-between gap-3">
              <span
                className={`mono rounded-full px-3 py-1 text-[10px] font-medium tracking-[0.08em] ${
                  lifecycle.failed
                    ? "bg-[#db6b5e]/20 text-[#b95046]"
                    : adjudication && !adjudication.approved
                      ? "bg-[#e09138]/20 text-[#c27623]"
                      : "bg-[var(--verdict)] text-[#18231f]"
                }`}
              >
                {lifecycle.failed
                  ? "FINALIZED · CONTRACT REVERTED"
                  : adjudication
                    ? adjudication.approved
                      ? "VERDICT: APPROVED · ESCROW SETTLED"
                      : "VERDICT: NOT APPROVED · ESCROW REMAINS OPEN"
                    : "FINALIZED · ON-CHAIN RECORD"}
              </span>
              <button
                onClick={() => {
                  setModalOpen(false);
                  onDismiss?.();
                }}
                className="mono grid h-8 w-8 place-items-center rounded-full border border-[var(--ink)] text-sm transition hover:bg-[var(--ink)] hover:text-[var(--paper)]"
                aria-label="Close status dialog"
              >
                ×
              </button>
            </div>

            {/* Main heading */}
            <h3
              id="tx-modal-title"
              className="mt-5 text-3xl font-medium leading-[0.95] tracking-[-0.05em] sm:text-4xl"
            >
              {lifecycle.failed
                ? `${action} Reverted On-Chain`
                : adjudication
                  ? adjudication.approved
                    ? `Submission Approved (${adjudication.score}/100)`
                    : `Submission Rejected (${adjudication.score}/100)`
                  : `${action} Confirmed`}
            </h3>

            {/* Description */}
            <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
              {lifecycle.failed
                ? "The transaction completed network consensus, but contract execution was rolled back. No state change was recorded."
                : adjudication
                  ? adjudication.approved
                    ? "GenLayer validators inspected the evidence against the brief and approved the work. The reward escrow has settled automatically to the builder."
                    : "GenLayer validators scored this evidence below the 80/100 threshold or found missing criteria. Escrow remains safely open for other builders."
                  : `The transaction has successfully finalized on GenLayer Studionet. ProofPay state is now updated on-chain.`}
            </p>

            {/* Adjudication details: Approved Winner Callout */}
            {adjudication?.approved && (
              <div className="mt-4 rounded-xl border border-[var(--verdict)] bg-[color-mix(in_srgb,var(--verdict)_20%,var(--paper))] p-4">
                <p className="mono text-[10px] tracking-[0.1em] text-[#18231f]">
                  BOUNTY WON & PAID OUT
                </p>
                <p className="mt-1 text-lg font-medium text-[var(--ink)]">
                  {reviewContext?.bountyReward
                    ? `${formatGen(reviewContext.bountyReward)} GEN Escrow Released`
                    : "Bounty Escrow Released to Winner"}
                </p>
                {adjudication.builder && (
                  <p className="mt-1 text-xs text-[var(--muted-ink)]">
                    Builder: <span className="mono font-medium text-[var(--ink)]">{shortAddress(adjudication.builder)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Adjudication details: AI Reason & Criteria */}
            {adjudication && (
              <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--card)] p-4">
                <p className="mono text-[10px] tracking-[0.1em] text-[var(--signal)]">
                  VALIDATOR VERDICT SUMMARY
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
                  {adjudication.reason}
                </p>
                {adjudication.criteria_report && (
                  <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-5 text-[var(--muted-ink)]">
                    {adjudication.criteria_report}
                  </p>
                )}
              </div>
            )}

            {/* Revert error callout */}
            {lifecycle.failed && (
              <div className="mt-5 rounded-lg border-l-2 border-[#db6b5e] bg-[#db6b5e]/10 p-4">
                <p className="mono text-[10px] tracking-[0.1em] text-[#b95046]">
                  REVERT REASON (FROM GENLAYER VALIDATORS)
                </p>
                <p className="mt-1 font-mono text-sm font-medium leading-5 text-[var(--ink)]">
                  {lifecycle.errorReason ||
                    lifecycle.detail.replace(/^Execution reverted: /, "")}
                </p>
                {hint && (
                  <p className="mt-3 border-t border-[#db6b5e]/20 pt-2 text-xs leading-5 text-[var(--muted-ink)]">
                    <strong className="font-medium text-[var(--ink)]">Tip:</strong> {hint}
                  </p>
                )}
              </div>
            )}

            {/* Transaction reference */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted-ink)]">
              <span className="mono text-[10px]">TX {shortHash(hash)}</span>
              <a
                href={genLayerTransactionUrl(hash)}
                target="_blank"
                rel="noreferrer"
                className="mono text-[10px] tracking-[0.08em] text-[var(--signal)] underline underline-offset-4"
              >
                VIEW ON EXPLORER ↗
              </a>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {lifecycle.failed ? (
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    onDismiss?.();
                  }}
                  className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--paper)] shadow-[3px_3px_0_var(--signal)] transition hover:-translate-y-0.5"
                >
                  Review & Fix Form
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      onDismiss?.();
                    }}
                    className="mono rounded-full border border-[var(--line)] px-4 py-2 text-xs tracking-[0.08em] transition hover:border-[var(--ink)]"
                  >
                    DISMISS
                  </button>
                  <Link
                    href={
                      reviewContext?.bountyId
                        ? `/bounties/${reviewContext.bountyId}`
                        : action.toLowerCase().includes("bounty")
                          ? "/bounties"
                          : "/reviews"
                    }
                    className="rounded-full bg-[var(--signal)] px-5 py-2.5 text-sm text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
                  >
                    {reviewContext?.bountyId ? "View Bounty Case →" : "View Records →"}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
