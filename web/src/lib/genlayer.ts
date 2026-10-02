import { abi, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import type { CalldataEncodable } from "genlayer-js/types";
import { fromHex, toHex, zeroAddress } from "viem";

export const PROOFPAY_NETWORK = {
  id: studionet.id,
  name: studionet.name,
  slug: "studionet",
} as const;

export const proofPayChainId = studionet.id;

export const genLayerExplorerUrl = "https://explorer-studio.genlayer.com";

export function genLayerTransactionUrl(hash: string) {
  return `${genLayerExplorerUrl}/tx/${hash}`;
}

export const proofPayContractAddress =
  process.env.NEXT_PUBLIC_PROOFPAY_CONTRACT_ADDRESS ??
  "0x5CCe24450B88BFC705794830C717c2D511253bF5";

const discoveryLimit = Number(process.env.NEXT_PUBLIC_PROOFPAY_DISCOVERY_LIMIT ?? "100");
export const proofPayDiscoveryLimit = Number.isSafeInteger(discoveryLimit) && discoveryLimit > 0 ? discoveryLimit : 100;

export { TransactionHashVariant };

export function createProofPayClient(account?: `0x${string}`) {
  return createClient({
    chain: studionet,
    ...(account ? { account } : {}),
  });
}

function isTransportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|network error|failed to fetch|timeout/i.test(message);
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  if (value instanceof Uint8Array) return toHex(value);
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, entry]) => [String(key), toJsonSafe(entry)]));
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    const bytes = (value as { bytes?: unknown }).bytes;
    if (bytes instanceof Uint8Array) return toHex(bytes);
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry)]));
  }
  return value;
}

async function quietReadContract(functionName: string, args: CalldataEncodable[]) {
  const calldata = abi.transactions.serialize([
    abi.calldata.encode(abi.calldata.makeCalldataObject(functionName, args, undefined)),
    false,
  ]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(studionet.rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "gen_call",
        params: [{
          type: "read",
          to: proofPayContractAddress,
          from: zeroAddress,
          data: calldata,
          transaction_hash_variant: TransactionHashVariant.LATEST_FINAL,
        }],
      }),
    });
    if (!response.ok) throw new Error(`GenLayer RPC returned HTTP ${response.status}.`);
    const payload = await response.json() as { error?: { message?: string }; result?: unknown };
    if (payload.error) throw new Error(payload.error.message ?? "GenLayer RPC rejected the read.");
    const result = payload.result;
    if (typeof result !== "string") throw new Error("Unexpected GenLayer RPC response.");
    return toJsonSafe(abi.calldata.decode(fromHex(`0x${result}`, "bytes")));
  } finally {
    clearTimeout(timeout);
  }
}

export type ContractReader = (functionName: string, args: CalldataEncodable[]) => Promise<unknown>;

let customContractReader: ContractReader | null = null;

export function setContractReaderForTesting(reader: ContractReader | null) {
  customContractReader = reader;
}

export async function readFinalContract(functionName: string, args: CalldataEncodable[]): Promise<unknown> {
  if (customContractReader) {
    return customContractReader(functionName, args);
  }
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await quietReadContract(functionName, args);
    } catch (error) {
      if (!isTransportFailure(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error("Unable to reach GenLayer RPC after retrying.");
}

export async function checkContractVersionCompatibility(): Promise<{ compatible: boolean; version?: string; error?: string }> {
  try {
    const version = await readFinalContract("get_contract_version", []);
    if (typeof version === "string" && version === "2.0.0") {
      return { compatible: true, version };
    }
    const versionStr = typeof version === "string" ? version : String(version ?? "unknown");
    return {
      compatible: false,
      version: versionStr,
      error: `Contract at ${shortAddress(proofPayContractAddress)} is version "${versionStr}", but ProofPay v2 requires version "2.0.0".`,
    };
  } catch (error) {
    return {
      compatible: false,
      error: error instanceof Error ? error.message : "Unable to verify contract version at the configured address.",
    };
  }
}

export type BountyDiscoveryOptions = {
  offset?: number;
  limit?: number;
  specificIds?: number[];
};

export type BountyDiscoveryResult = {
  bounties: unknown[];
  totalCount: number;
  loadedCount: number;
  failedIds: number[];
  hasMore: boolean;
};

/**
 * ProofPay v2 defines get_bounty_count().
 * Reads canonical finalized bounties newest-first with pagination and error tracking.
 */
export async function discoverFinalBounties(
  options: BountyDiscoveryOptions = {},
): Promise<BountyDiscoveryResult> {
  const { offset = 0, limit = proofPayDiscoveryLimit, specificIds } = options;

  let totalCount = 0;
  let targetIds: number[] = [];

  if (specificIds && specificIds.length > 0) {
    targetIds = [...specificIds];
    totalCount = specificIds.length;
  } else {
    const rawCount = await readFinalContract("get_bounty_count", []);
    const count = typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount ?? 0);
    if (!Number.isSafeInteger(count) || count <= 0) {
      return { bounties: [], totalCount: 0, loadedCount: 0, failedIds: [], hasMore: false };
    }
    totalCount = count;

    // Load newest bounties first: starting from (count - offset) down to max(1, count - offset - limit + 1)
    const startId = count - offset;
    const endId = Math.max(1, startId - limit + 1);
    if (startId >= 1) {
      for (let id = startId; id >= endId; id--) {
        targetIds.push(id);
      }
    }
  }

  const bounties: unknown[] = [];
  const failedIds: number[] = [];
  const batchSize = 10;

  for (let i = 0; i < targetIds.length; i += batchSize) {
    const slice = targetIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      slice.map(async (bountyId) => {
        try {
          const res = await readFinalContract("get_bounty", [bountyId]);
          if (res !== null && res !== undefined) {
            return { id: bountyId, bounty: res, error: false };
          }
          return { id: bountyId, bounty: null, error: true };
        } catch {
          return { id: bountyId, bounty: null, error: true };
        }
      }),
    );
    for (const res of batchResults) {
      if (res.error || res.bounty === null) {
        failedIds.push(res.id);
      } else {
        bounties.push(res.bounty);
      }
    }
  }

  const hasMore = !specificIds && offset + targetIds.length < totalCount;

  return {
    bounties,
    totalCount,
    loadedCount: bounties.length,
    failedIds,
    hasMore,
  };
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatGen(balance: string) {
  const balanceInWei = BigInt(balance);
  const weiPerGen = BigInt("1000000000000000000");
  const whole = balanceInWei / weiPerGen;
  const fraction = (balanceInWei % weiPerGen).toString().padStart(18, "0").slice(0, 2);
  return fraction === "00" ? whole.toString() : `${whole}.${fraction.replace(/0+$/, "")}`;
}
