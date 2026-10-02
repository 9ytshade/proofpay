"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  checkContractVersionCompatibility,
  createProofPayClient,
  proofPayContractAddress,
  shortAddress,
} from "@/lib/genlayer";
import { TransactionLifecycle } from "@/components/transaction-lifecycle";
import { isFutureUnixTimestamp, parseDeadlineToUtcPreview, parseGenToWei } from "@/lib/safety";

type SubmitState = "idle" | "submitting" | "submitted" | "error";

type FormValues = {
  title: string;
  brief: string;
  criteria: string;
  deadline: string;
  reward: string;
};

const initialValues: FormValues = { title: "", brief: "", criteria: "", deadline: "", reward: "" };

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function CreateBounty() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  const criteriaCount = useMemo(
    () => values.criteria.split("\n").map((item) => item.trim()).filter(Boolean).length,
    [values.criteria],
  );

  const deadlinePreview = useMemo(
    () => parseDeadlineToUtcPreview(values.deadline),
    [values.deadline],
  );

  // Restore pending transaction if browser was refreshed
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("proofpay_active_create_tx");
        if (saved) {
          const parsed = JSON.parse(saved) as { hash?: string };
          if (parsed && typeof parsed.hash === "string" && parsed.hash) {
            setTransactionHash(parsed.hash);
            setState("submitted");
            setMessage("Recovered in-flight bounty transaction tracking from previous session.");
          }
        }
      } catch {
        // Ignore storage errors
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setTransactionHash("");

    try {
      const title = values.title.trim();
      const brief = values.brief.trim();
      const criteria = values.criteria.split("\n").map((item) => item.trim()).filter(Boolean).join("\n");
      const deadline = Math.floor(new Date(values.deadline).getTime() / 1000);
      const reward = parseGenToWei(values.reward);
      if (title.length < 3) throw new Error("Give the bounty a title of at least 3 characters.");
      if (brief.length < 20) throw new Error("Describe the work in at least 20 characters.");
      if (criteriaCount < 1 || criteriaCount > 5) throw new Error("Provide between 1 and 5 acceptance criteria.");
      if (!isFutureUnixTimestamp(deadline)) throw new Error("Choose a future deadline.");
      if (reward <= BigInt(0)) throw new Error("The escrow reward must be greater than zero.");
      if (!window.ethereum) throw new Error("Install or unlock MetaMask before creating a bounty.");

      const versionCheck = await checkContractVersionCompatibility();
      if (!versionCheck.compatible) {
        throw new Error(versionCheck.error ?? "The contract version is incompatible with ProofPay v2.");
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
      if (!address) throw new Error("Connect your wallet from the header first.");

      setState("submitting");
      const client = createProofPayClient(address as `0x${string}`);
      const hash = await client.writeContract({
        address: proofPayContractAddress as `0x${string}`,
        functionName: "create_bounty",
        args: [title, brief, criteria, deadline],
        value: reward,
      });
      const hashStr = String(hash);
      setTransactionHash(hashStr);
      try {
        localStorage.setItem("proofpay_active_create_tx", JSON.stringify({ hash: hashStr }));
      } catch {
        // Ignore storage errors
      }
      setState("submitted");
      setMessage("Your bounty is submitted to GenLayer. The reward is held in escrow only if consensus finalizes this transaction.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The bounty could not be submitted.");
    }
  }

  return (
    <section id="create" className="scroll-mt-8 py-20 md:py-28">
      <div className="grid gap-9 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="mono text-[10px] tracking-[.12em] text-[var(--signal)]">OPEN A NEW CASE</p>
          <h2 className="mt-4 max-w-sm text-5xl leading-[.9] tracking-[-.06em] sm:text-6xl">Fund the outcome, not a promise.</h2>
          <p className="mt-5 max-w-sm leading-6 text-[var(--muted-ink)]">Your reward is sent with the transaction and held by ProofPay. The brief and its criteria become the public standard for every submission.</p>
          <div className="mt-8 border-l-2 border-[var(--signal)] pl-4">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">ESCROW RULE</p>
            <p className="mt-2 text-sm leading-5">Your wallet approves the reward amount. Network transaction costs, if any, remain separate from the bounty reward.</p>
          </div>
          <div className="mt-5 border-l-2 border-[var(--ink)] pl-4">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">WINNER MODEL</p>
            <p className="mt-2 text-sm leading-5">This is a single-winner bounty. The first submission with a finalized approved verdict receives the full reward.</p>
          </div>
        </div>
        <form onSubmit={submit} className="creator-form md:col-span-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="BOUNTY TITLE" hint="3–120 characters">
              <input required value={values.title} onChange={(event) => update("title", event.target.value)} maxLength={120} placeholder="e.g. Audit our onboarding flow" />
            </Field>
            <Field label="REWARD IN GEN" hint="Locked with this transaction">
              <input required inputMode="decimal" value={values.reward} onChange={(event) => update("reward", event.target.value)} placeholder="100" />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="THE BRIEF" hint="Explain the desired public outcome">
              <textarea required value={values.brief} onChange={(event) => update("brief", event.target.value)} maxLength={10000} rows={5} placeholder="Describe exactly what the builder should deliver and how it will be useful." />
            </Field>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_13rem]">
            <Field label="ACCEPTANCE CRITERIA" hint={`${criteriaCount}/5 criteria — one per line`}>
              <textarea required value={values.criteria} onChange={(event) => update("criteria", event.target.value)} maxLength={3000} rows={5} placeholder={"A public GitHub repository is accessible\nThe live deployment works over HTTPS\nThe handoff explains how to verify it"} />
            </Field>
            <Field label="DEADLINE" hint="Local time (stored as UTC on-chain)">
              <input required type="datetime-local" value={values.deadline} onChange={(event) => update("deadline", event.target.value)} />
              {deadlinePreview && (
                <span className="mono mt-1.5 block text-[10px] text-[var(--signal)]">
                  → {deadlinePreview.utc}
                </span>
              )}
            </Field>
          </div>

          {/* Pre-Confirmation Summary */}
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4" aria-label="Transaction pre-confirmation summary">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--signal)]">TRANSACTION PRE-CONFIRMATION SUMMARY</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">ESCROW REWARD</span>
                <span className="font-medium text-[var(--ink)]">{values.reward ? `${values.reward} GEN` : "—"}</span>
              </div>
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">FINAL UTC DEADLINE</span>
                <span className="mono font-medium text-[var(--ink)]">{deadlinePreview ? deadlinePreview.utc : "—"}</span>
              </div>
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">NETWORK</span>
                <span className="font-medium text-[var(--ink)]">Studionet (61999)</span>
              </div>
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">CONTRACT TARGET</span>
                <span className="mono font-medium text-[var(--ink)]">{shortAddress(proofPayContractAddress)}</span>
              </div>
            </div>
            {deadlinePreview && (
              <p className="mt-3 border-t border-[var(--line)] pt-2 text-[11px] text-[var(--muted-ink)]">
                Local selection <strong className="text-[var(--ink)]">{deadlinePreview.local}</strong> converts to exactly <strong className="text-[var(--ink)]">{deadlinePreview.utc}</strong> (Unix timestamp: {deadlinePreview.unix}) upon wallet confirmation.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <p className="max-w-md text-sm leading-5 text-[var(--muted-ink)]">By creating this bounty, you publish the brief and permanently escrow the displayed reward until ProofPay settles it.</p>
            <button type="submit" disabled={state === "submitting"} className="rounded-full bg-[var(--signal)] px-6 py-3 text-sm text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)] disabled:cursor-wait disabled:opacity-60">
              {state === "submitting" ? "Awaiting wallet…" : "Fund & publish bounty"}
            </button>
          </div>

          {message && (
            <div className={`creator-message ${state === "error" ? "creator-message-error" : ""}`} role="status">
              <p>{message}</p>
              {transactionHash && <p className="mono mt-2 text-[10px] tracking-[.07em]">TRANSACTION {shortHash(transactionHash)}</p>}
              {state === "submitted" && <p className="mt-2 text-xs text-[var(--muted-ink)]">After successful finalization, refresh the bounty desk. ProofPay discovers finalized cases automatically.</p>}
            </div>
          )}

          {transactionHash && (
            <TransactionLifecycle
              hash={transactionHash}
              action="Bounty creation"
              onDismiss={() => {
                try {
                  localStorage.removeItem("proofpay_active_create_tx");
                } catch {
                  // Ignore
                }
                if (state === "error") {
                  setState("idle");
                }
              }}
              onStatusChange={(status) => {
                if (status.done) {
                  try {
                    localStorage.removeItem("proofpay_active_create_tx");
                  } catch {
                    // Ignore
                  }
                  if (status.failed) {
                    setState("error");
                    setMessage(status.errorReason ? `Bounty creation reverted: ${status.errorReason}` : "Bounty creation reverted on-chain.");
                  } else {
                    setState("submitted");
                    setMessage("Your bounty has been finalized and funded on GenLayer! It is now live on the bounty desk.");
                  }
                }
              }}
            />
          )}
        </form>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">{label}</span>
        <span className="mono text-right text-[9px] tracking-[.05em] text-[var(--muted-ink)]">{hint}</span>
      </span>
      <span className="creator-input mt-2 block">{children}</span>
    </label>
  );
}
