"use client";

import { useEffect, useState } from "react";
import {
  createProofPayClient,
  formatGen,
  PROOFPAY_NETWORK,
  shortAddress,
} from "@/lib/genlayer";

type ConnectionState = "idle" | "connecting" | "connected" | "wrong-network" | "unavailable" | "error";

type WalletState = {
  address?: string;
  balance?: string;
  message?: string;
  state: ConnectionState;
};

const initialWalletState: WalletState = { state: "idle" };

function isUserRejection(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const walletError = error as { code?: number; rpcCode?: number };
  return walletError.code === 4001 || walletError.rpcCode === 4001;
}

async function readWallet(address: string): Promise<WalletState> {
  if (!window.ethereum) return { state: "unavailable" };

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (Number(chainId) !== PROOFPAY_NETWORK.id) {
    return { address, state: "wrong-network" };
  }

  const balance = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  });

  return {
    address,
    balance: typeof balance === "string" ? formatGen(balance) : undefined,
    state: "connected",
  };
}

export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [locallyDisconnected, setLocallyDisconnected] = useState(() =>
    typeof window !== "undefined" && window.sessionStorage.getItem("proofpay-wallet-disconnected") === "true",
  );

  async function refreshWallet() {
    try {
      if (!window.ethereum) {
        setWallet({ state: "unavailable" });
        return;
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
      setWallet(address ? await readWallet(address) : initialWalletState);
    } catch {
      setWallet({ state: "error", message: "Wallet details are temporarily unavailable. Try connecting again." });
    }
  }

  useEffect(() => {
    const restoreWallet = window.setTimeout(() => {
      if (!locallyDisconnected) void refreshWallet();
    }, 0);
    if (!window.ethereum) return;

    const onAccountsChanged = () => {
      window.sessionStorage.removeItem("proofpay-wallet-disconnected");
      setLocallyDisconnected(false);
      void refreshWallet();
    };
    const onChainChanged = () => { if (!locallyDisconnected) void refreshWallet(); };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.clearTimeout(restoreWallet);
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
    };
  }, [locallyDisconnected]);

  function refreshPage() {
    setReloading(true);
    window.setTimeout(() => window.location.reload(), 300);
  }

  async function connect() {
    if (!window.ethereum) {
      setWallet({ state: "unavailable" });
      return false;
    }

    setWallet({ state: "connecting" });
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
      if (!address) throw new Error("No account was selected in your wallet.");

      // GenLayer's SDK performs the safe switch/add-network flow for Studionet.
      const client = createProofPayClient(address as `0x${string}`);
      await client.connect(PROOFPAY_NETWORK.slug);
      window.sessionStorage.removeItem("proofpay-wallet-disconnected");
      setLocallyDisconnected(false);
      setWallet(await readWallet(address));
      return true;
    } catch (error) {
      if (isUserRejection(error)) {
        setWallet(initialWalletState);
        return false;
      }
      const message = error instanceof Error ? error.message : "Wallet connection was not completed.";
      setWallet({ state: "error", message });
      return false;
    }
  }

  async function revokeWalletPermission() {
    if (!window.ethereum) return;
    try {
      // EIP-2255: MetaMask maps this permission revocation to a dapp disconnect.
      await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
    } catch (error) {
      // Older wallet providers may not implement revocation. ProofPay still
      // clears its own session and offers the account picker as a fallback.
      if (!isUserRejection(error)) return;
    }
  }

  async function disconnect() {
    setMenuOpen(false);
    setReloading(true);
    await revokeWalletPermission();
    window.sessionStorage.setItem("proofpay-wallet-disconnected", "true");
    setLocallyDisconnected(true);
    setWallet(initialWalletState);
    refreshPage();
  }

  async function changeAccount() {
    if (!window.ethereum) return;
    setMenuOpen(false);
    setWallet({ state: "connecting" });
    await revokeWalletPermission();
    // Requesting after revocation reliably presents MetaMask's account picker.
    if (await connect()) refreshPage();
  }

  if (wallet.state === "connected" && wallet.address) {
    return (
      <div className="relative">
        <button onClick={() => setMenuOpen((open) => !open)} className="wallet-status transition hover:bg-[var(--ink)] hover:text-[var(--paper)]" title={`Connected to ${PROOFPAY_NETWORK.name}`} aria-expanded={menuOpen} aria-label="Manage connected wallet">
          <span className="wallet-status-dot" aria-hidden="true" />
          <span className="mono text-[10px] tracking-[0.06em]">{shortAddress(wallet.address)}</span>
          <span className="hidden border-l border-[var(--line)] pl-2 text-[10px] text-[var(--muted-ink)] sm:inline">
            {wallet.balance ?? "—"} GEN
          </span>
          <span className="ml-1 text-[10px]" aria-hidden="true">⌄</span>
        </button>
        {menuOpen && <div className="wallet-menu"><p className="mono px-3 pb-2 text-[9px] tracking-[.08em] text-[var(--muted-ink)]">CONNECTED WALLET</p><button onClick={() => void changeAccount()}>Change account</button><button onClick={() => void disconnect()}>Disconnect wallet</button></div>}
      </div>
    );
  }

  const label = reloading
    ? "REFRESHING…"
    : wallet.state === "connecting"
    ? "CONNECTING…"
    : wallet.state === "wrong-network"
      ? "SWITCH TO STUDIONET"
      : "CONNECT WALLET";

  return (
    <div className="relative">
      <button
        onClick={connect}
        disabled={wallet.state === "connecting" || reloading}
        className="mono rounded-full border border-[var(--ink)] px-4 py-2 text-[11px] tracking-[0.08em] transition hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:cursor-wait disabled:opacity-60"
      >
        {label}
      </button>
      {(wallet.state === "unavailable" || wallet.state === "error") && (
        <p role="status" className="wallet-message">
          {wallet.state === "unavailable" ? "Install or unlock MetaMask to connect to GenLayer." : wallet.message}
        </p>
      )}
    </div>
  );
}
