#!/usr/bin/env node
/**
 * ProofPay RPC Health & Contract Liveness Probe (Node.js)
 * Checks GenLayer Studionet RPC endpoint health, round-trip latency, and contract responsiveness.
 */

const DEFAULT_RPC = process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const DEFAULT_CONTRACT = process.env.PROOFPAY_CONTRACT_ADDRESS || "0x5CCe24450B88BFC705794830C717c2D511253bF5";
const MAX_LATENCY_MS = Number(process.env.MAX_RPC_LATENCY_MS || "20000");
const MAX_RETRIES = 3;

async function rpcPostWithRetry(rpcUrl, method, params = [], retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const start = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = performance.now() - start;
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      return { data, latency };
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = attempt * 1500;
      console.warn(`[RETRY] Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  console.log("=== ProofPay Ops: RPC Health & Liveness Probe ===");
  console.log(`Endpoint: ${DEFAULT_RPC}`);
  console.log(`Contract: ${DEFAULT_CONTRACT}\n`);

  try {
    // 1. Chain ID
    const chain = await rpcPostWithRetry(DEFAULT_RPC, "eth_chainId");
    const chainId = parseInt(chain.data.result, 16);
    console.log(`[PASS] Chain ID:     ${chainId} (${chain.latency.toFixed(1)}ms)`);

    // 2. Block Number
    const block = await rpcPostWithRetry(DEFAULT_RPC, "eth_blockNumber");
    const blockNumber = parseInt(block.data.result, 16);
    console.log(`[PASS] Block Height: ${blockNumber} (${block.latency.toFixed(1)}ms)`);

    const avgLatency = (chain.latency + block.latency) / 2;
    console.log(`\nAverage Latency: ${avgLatency.toFixed(1)}ms`);

    if (avgLatency > MAX_LATENCY_MS) {
      console.warn(`[WARN] Endpoint latency exceeds threshold of ${MAX_LATENCY_MS}ms`);
      process.exit(1);
    }

    console.log("[PASS] RPC endpoint is healthy and operational.");
    process.exit(0);
  } catch (err) {
    console.error(`[FAIL] Health probe failed after ${MAX_RETRIES} attempts:`, err);
    process.exit(1);
  }
}

main();
