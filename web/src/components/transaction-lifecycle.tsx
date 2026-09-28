"use client";

import { useCallback, useEffect, useState } from "react";
import { createProofPayClient, genLayerTransactionUrl } from "@/lib/genlayer";
import type { Hash } from "genlayer-js/types";

type LifecycleState = {
  status: string;
  result?: string;
  detail: string;
  done: boolean;
  failed: boolean;
};

const initialState: LifecycleState = { status: "PENDING", detail: "Transaction submitted. Waiting for the ProofPay network record.", done: false, failed: false };

function describe(status: string, result?: string): LifecycleState {
  const normalized = status || "PENDING";
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
    FINALIZED: result === "FAILURE" ? "The transaction finalized without changing ProofPay state." : "Finalized. ProofPay state is now a durable public record.",
    UNDETERMINED: "The network could not reach a final result. Review the transaction before retrying.",
    CANCELED: "This transaction was canceled before finality.",
    VALIDATORS_TIMEOUT: "Validators timed out. Review the transaction before retrying.",
    LEADER_TIMEOUT: "The leader timed out. Review the transaction before retrying.",
  };
  const failed = ["UNDETERMINED", "CANCELED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(normalized) || (normalized === "FINALIZED" && result === "FAILURE");
  return { status: normalized, result, detail: detailByStatus[normalized] ?? "The transaction is progressing through GenLayer consensus.", done: normalized === "FINALIZED" || failed, failed };
}

export function TransactionLifecycle({ hash, action }: { hash: string; action: string }) {
  const [lifecycle, setLifecycle] = useState<LifecycleState>(initialState);
  const [lastUpdated, setLastUpdated] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const transaction = await createProofPayClient().getTransaction({ hash: hash as Hash });
      const next = describe(String(transaction.statusName ?? transaction.status ?? "PENDING"), transaction.resultName ? String(transaction.resultName) : undefined);
      setLifecycle(next);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      setLifecycle((current) => ({ ...current, detail: "The transaction is submitted. We will retry its network status shortly." }));
    }
  }, [hash]);

  useEffect(() => {
    const initialPoll = window.setTimeout(() => void refresh(), 0);
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => { window.clearTimeout(initialPoll); window.clearInterval(poll); };
  }, [refresh]);

  async function copyHash() {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className={`lifecycle ${lifecycle.failed ? "lifecycle-failed" : lifecycle.done ? "lifecycle-final" : ""}`} aria-live="polite"><div className="flex items-center justify-between gap-3"><p className="mono text-[10px] tracking-[.1em]">{action.toUpperCase()} · {lifecycle.status.replaceAll("_", " ")}</p><button type="button" onClick={() => void refresh()} className="mono text-[9px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4">REFRESH</button></div><div className="mt-3 flex items-center gap-2"><span className="lifecycle-dot" aria-hidden="true" /><p className="text-sm leading-5">{lifecycle.detail}</p></div>{lifecycle.result && <p className="mono mt-2 text-[9px] tracking-[.08em] text-[var(--muted-ink)]">CONSENSUS RESULT · {lifecycle.result}</p>}<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"><button type="button" onClick={() => void copyHash()} className="mono text-[9px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4">{copied ? "COPIED TRANSACTION ID" : "COPY TRANSACTION ID"}</button><a href={genLayerTransactionUrl(hash)} target="_blank" rel="noreferrer" className="mono text-[9px] tracking-[.08em] underline decoration-[var(--line)] underline-offset-4">VIEW TRANSACTION ↗</a></div>{lastUpdated && <p className="mono mt-2 text-[9px] tracking-[.08em] text-[var(--muted-ink)]">LAST CHECK · {lastUpdated} · AUTO-REFRESHES EVERY 5S</p>}</div>;
}
