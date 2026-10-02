"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  checkContractVersionCompatibility,
  createProofPayClient,
  discoverFinalBounties,
  formatGen,
  proofPayContractAddress,
  shortAddress,
} from "@/lib/genlayer";
import { TransactionLifecycle } from "@/components/transaction-lifecycle";
import {
  isHttpsUrl,
  isPublicGithubCommitUrl,
  normalizeHttpsUrl,
  validateEvidencePaths,
} from "@/lib/safety";

type Bounty = {
  id: number | string;
  title: string;
  brief: string;
  reward: string;
  status: string;
  deadline: number | string;
  client: string;
};

type FormValues = {
  bountyId: string;
  repositoryUrl: string;
  deploymentUrl: string;
  evidencePaths: string;
  summary: string;
};

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "submitted" | "error";

const initialValues: FormValues = {
  bountyId: "",
  repositoryUrl: "",
  deploymentUrl: "",
  evidencePaths: "",
  summary: "",
};

function asBounty(value: unknown): Bounty | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = ["id", "title", "brief", "reward", "status", "deadline", "client"];
  return keys.some((key) => record[key] === undefined) ? null : (record as unknown as Bounty);
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function SubmitProof() {
  const params = useParams<{ id?: string }>();
  const prefillBountyId = params?.id ?? "";

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [values, setValues] = useState<FormValues>({ ...initialValues, bountyId: prefillBountyId });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const openBounties = useMemo(() => bounties.filter((bounty) => bounty.status === "open"), [bounties]);
  const selectedBounty = openBounties.find((bounty) => String(bounty.id) === values.bountyId);

  // Restore in-flight submission tracking if page was refreshed (Item 15)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("proofpay_active_submit_tx");
        if (saved) {
          const parsed = JSON.parse(saved) as { hash?: string; bountyId?: string };
          if (parsed && typeof parsed.hash === "string" && parsed.hash) {
            setTransactionHash(parsed.hash);
            if (parsed.bountyId) {
              setValues((cur) => ({ ...cur, bountyId: parsed.bountyId ?? cur.bountyId }));
            }
            setSubmitState("submitted");
            setMessage("Recovered in-flight proof submission tracking from previous session.");
          }
        }
      } catch {
        // Ignore
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadBounties = useCallback(async () => {
    setLoadState("loading");
    try {
      const reads = await discoverFinalBounties();
      const loaded = reads.map(asBounty);
      setBounties(loaded.filter((bounty): bounty is Bounty => bounty !== null));
      setLoadState("ready");
    } catch {
      setBounties([]);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBounties(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBounties]);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setTransactionHash("");

    try {
      const repositoryUrl = values.repositoryUrl.trim();
      const deploymentUrl = normalizeHttpsUrl(values.deploymentUrl.trim());
      const summary = values.summary.trim();
      if (!selectedBounty) throw new Error("Choose an open bounty before submitting evidence.");
      if (!isPublicGithubCommitUrl(repositoryUrl)) throw new Error("Use a full GitHub commit permalink ending in a 40-character commit SHA.");
      if (!isHttpsUrl(deploymentUrl)) throw new Error("Use a live HTTPS deployment URL.");
      const manifestResult = validateEvidencePaths(values.evidencePaths);
      if (!manifestResult.valid) throw new Error(manifestResult.error ?? "Invalid source evidence manifest.");
      if (summary.length < 10) throw new Error("Write a proof summary of at least 10 characters.");
      if (!window.ethereum) throw new Error("Install or unlock MetaMask before submitting proof.");

      const versionCheck = await checkContractVersionCompatibility();
      if (!versionCheck.compatible) {
        throw new Error(versionCheck.error ?? "The contract version is incompatible with ProofPay v2.");
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
      if (!address) throw new Error("Connect your builder wallet from the header first.");
      if (address.toLowerCase() === selectedBounty.client.toLowerCase()) {
        throw new Error("Switch to a builder wallet. A bounty client cannot submit to their own bounty.");
      }

      setSubmitState("submitting");
      const hash = await createProofPayClient(address as `0x${string}`).writeContract({
        address: proofPayContractAddress as `0x${string}`,
        functionName: "submit_proof",
        args: [
          Number(selectedBounty.id),
          repositoryUrl,
          deploymentUrl,
          summary,
          manifestResult.paths.join("\n"),
        ],
        value: BigInt(0),
      });

      const hashStr = String(hash);
      setTransactionHash(hashStr);
      try {
        localStorage.setItem(
          "proofpay_active_submit_tx",
          JSON.stringify({ hash: hashStr, bountyId: String(selectedBounty.id) }),
        );
      } catch {
        // Ignore
      }

      setSubmitState("submitted");
      setMessage("Your evidence has been submitted to GenLayer. Once finalized, it is ready for intelligent adjudication.");
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "The proof submission could not be sent.");
    }
  }

  return (
    <section id="submit-proof" className="scroll-mt-8 py-20 md:py-28">
      <div className="grid gap-9 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="mono text-[10px] tracking-[.12em] text-[var(--signal)]">BUILDER EVIDENCE DESK</p>
          <h2 className="mt-4 max-w-sm text-5xl leading-[.9] tracking-[-.06em] sm:text-6xl">
            Show the work.<br /><span className="italic">Make the case.</span>
          </h2>
          <p className="mt-5 max-w-sm leading-6 text-[var(--muted-ink)]">
            ProofPay accepts a full GitHub commit permalink, a public HTTPS deployment, 1–6 relative text source paths, and a concise explanation. The permalink and source manifest are immutable; deployment content remains mutable.
          </p>
          <div className="mt-8 border-l-2 border-[var(--signal)] pl-4">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">BUILDER RULE</p>
            <p className="mt-2 text-sm leading-5">Connect a different wallet from the bounty creator. The contract enforces this too.</p>
          </div>
          <div className="mt-5 border-l-2 border-[var(--ink)] pl-4">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">WINNER MODEL</p>
            <p className="mt-2 text-sm leading-5">A case pays one builder: the first evidence record to receive a finalized approved verdict wins the full escrow.</p>
          </div>
        </div>

        <form onSubmit={submit} className="creator-form md:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mono text-[10px] tracking-[.1em] text-[var(--muted-ink)]">SELECT AN OPEN CASE</p>
              <p className="mt-1 text-sm text-[var(--muted-ink)]">Only finalized, open bounties can receive evidence.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadBounties()}
              className="mono rounded-full border border-[var(--line)] px-3 py-1 text-[10px] tracking-[.08em] transition hover:border-[var(--ink)]"
            >
              REFRESH
            </button>
          </div>

          <div className="mt-4 creator-input">
            <select
              required
              value={values.bountyId}
              onChange={(event) => update("bountyId", event.target.value)}
              disabled={loadState !== "ready" || openBounties.length === 0}
            >
              <option value="">
                {loadState === "loading"
                  ? "Loading finalized bounties…"
                  : openBounties.length
                    ? "Choose an open bounty"
                    : "No open configured bounties"}
              </option>
              {openBounties.map((bounty) => (
                <option key={String(bounty.id)} value={String(bounty.id)}>
                  #{bounty.id} · {bounty.title} · {formatGen(bounty.reward)} GEN
                </option>
              ))}
            </select>
          </div>

          {selectedBounty && (
            <div className="selected-case">
              <p className="mono text-[9px] tracking-[.1em] text-[var(--signal)]">THE STANDARD FOR CASE #{selectedBounty.id}</p>
              <p className="mt-2 text-sm leading-5">{selectedBounty.brief}</p>
              <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-5 text-[var(--muted-ink)]">
                Single-winner case: the first submission with a finalized approved verdict receives the full {formatGen(selectedBounty.reward)} GEN escrow.
              </p>
            </div>
          )}

          {loadState === "error" && (
            <p className="mt-4 text-sm text-[#b95046]">Could not load public bounty records. Check your connection, then refresh.</p>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ProofField label="GITHUB COMMIT PERMALINK" hint="Full 40-character SHA">
              <input
                required
                type="url"
                value={values.repositoryUrl}
                onChange={(event) => update("repositoryUrl", event.target.value)}
                placeholder="https://github.com/owner/repo/commit/40-character-sha"
              />
            </ProofField>
            <ProofField label="LIVE DEPLOYMENT" hint="HTTPS only; content can change">
              <input
                required
                type="url"
                value={values.deploymentUrl}
                onChange={(event) => update("deploymentUrl", event.target.value)}
                placeholder="https://your-project.example"
              />
            </ProofField>
          </div>

          <div className="mt-5">
            <ProofField label="SOURCE EVIDENCE MANIFEST" hint="1–6 text files · one per line">
              <textarea
                required
                rows={4}
                maxLength={1500}
                value={values.evidencePaths}
                onChange={(event) => update("evidencePaths", event.target.value)}
                placeholder={"src/app/page.tsx\nsrc/components/checkout.tsx\npackage.json"}
              />
            </ProofField>
            <p className="mt-2 text-xs leading-5 text-[var(--muted-ink)]">
              Validators fetch each path directly from raw.githubusercontent.com pinned to the submitted commit SHA. Supported formats: .py, .ts, .tsx, .json, .md, Dockerfile, etc.
            </p>
          </div>

          <div className="mt-5">
            <ProofField label="PROOF SUMMARY" hint="Explain how the evidence meets the brief">
              <textarea
                required
                rows={5}
                maxLength={3000}
                value={values.summary}
                onChange={(event) => update("summary", event.target.value)}
                placeholder="Point the validator to the relevant implementation and explain how it satisfies the criteria."
              />
            </ProofField>
          </div>

          {/* Pre-Confirmation Summary (Item 16) */}
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4" aria-label="Transaction pre-confirmation summary">
            <p className="mono text-[10px] tracking-[.1em] text-[var(--signal)]">TRANSACTION PRE-CONFIRMATION SUMMARY</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">BOUNTY TARGET</span>
                <span className="font-medium text-[var(--ink)]">{selectedBounty ? `#${selectedBounty.id}` : "—"}</span>
              </div>
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">ESCROW REWARD</span>
                <span className="font-medium text-[var(--ink)]">{selectedBounty ? `${formatGen(selectedBounty.reward)} GEN` : "—"}</span>
              </div>
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">NETWORK FEE</span>
                <span className="font-medium text-[var(--ink)]">0 GEN</span>
              </div>
              <div>
                <span className="mono block text-[9px] text-[var(--muted-ink)]">CONTRACT TARGET</span>
                <span className="mono font-medium text-[var(--ink)]">{shortAddress(proofPayContractAddress)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <p className="max-w-md text-sm leading-5 text-[var(--muted-ink)]">
              Submitting evidence does not move the escrow. Only a final approved verdict pays the reward.
            </p>
            <button
              type="submit"
              disabled={submitState === "submitting" || !selectedBounty}
              className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm text-[var(--paper)] shadow-[4px_4px_0_var(--signal)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            >
              {submitState === "submitting" ? "Submitting proof…" : "Submit evidence"}
            </button>
          </div>

          {message && (
            <div className={`creator-message ${submitState === "error" ? "creator-message-error" : ""}`} role="status">
              <p>{message}</p>
              {transactionHash && <p className="mono mt-2 text-[10px] tracking-[.07em]">TRANSACTION {shortHash(transactionHash)}</p>}
            </div>
          )}

          {transactionHash && (
            <TransactionLifecycle
              hash={transactionHash}
              action="Proof submission"
              onDismiss={() => {
                try {
                  localStorage.removeItem("proofpay_active_submit_tx");
                } catch {
                  // Ignore
                }
                if (submitState === "error") {
                  setSubmitState("idle");
                }
              }}
              onStatusChange={(status) => {
                if (status.done) {
                  try {
                    localStorage.removeItem("proofpay_active_submit_tx");
                  } catch {
                    // Ignore
                  }
                  if (status.failed) {
                    setSubmitState("error");
                    setMessage(
                      status.errorReason
                        ? `The submission reverted on-chain: ${status.errorReason}`
                        : "The submission reverted on-chain. Please check your URLs and try again.",
                    );
                  } else {
                    setSubmitState("submitted");
                    setMessage("Your evidence has been finalized and recorded on-chain! Ready for intelligent review.");
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

function ProofField({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
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
