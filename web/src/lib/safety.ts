export function parseGenToWei(value: string) {
  const cleaned = value.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(cleaned)) {
    throw new Error("Enter a whole or decimal GEN amount with up to 18 decimal places.");
  }
  const [whole, fraction = ""] = cleaned.split(".");
  return BigInt(`${whole}${fraction.padEnd(18, "0")}`);
}

export function isHttpsUrl(value: string) {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeHttpsUrl(value: string): string {
  const cleaned = value.trim();
  if (!cleaned.startsWith("https://")) return cleaned;
  const afterScheme = cleaned.slice("https://".length);
  if (!afterScheme.includes("/")) {
    return `${cleaned}/`;
  }
  return cleaned;
}

export function isPublicGithubCommitUrl(value: string) {
  const cleaned = value.trim();
  const prefix = "https://github.com/";
  if (cleaned.length > 2048 || !cleaned.startsWith(prefix) || /[?#@\\]/.test(cleaned)) return false;

  const parts = cleaned.slice(prefix.length).split("/");
  if (parts.length !== 4) return false;
  const [owner, repository, kind, commitSha] = parts;
  const ownerCharacters = /^[A-Za-z0-9-]+$/;
  const repositoryCharacters = /^[A-Za-z0-9._-]+$/;

  return Boolean(
    owner && owner.length <= 39 && ownerCharacters.test(owner) && !owner.startsWith("-") && !owner.endsWith("-") &&
    repository && repository.length <= 100 && repositoryCharacters.test(repository) && repository !== "." && repository !== ".." &&
    kind === "commit" && commitSha && /^[a-f0-9]{40}$/i.test(commitSha),
  );
}

export function isFutureUnixTimestamp(timestamp: number, nowMilliseconds = Date.now()) {
  return Number.isFinite(timestamp) && timestamp > Math.floor(nowMilliseconds / 1000);
}

const UNDETERMINED_STORAGE_KEY = "proofpay_undetermined_reviews";

export type UndeterminedInfo = {
  reason: string;
  txHash?: string;
  timestamp: number;
};

const DEFAULT_UNDETERMINED: Record<string, UndeterminedInfo> = {
  "5:1": {
    reason: "Repository evidence could not be retrieved (HTTP 404 Not Found)",
    txHash: "0x1198b69a143588b66823559e5c0d2b83b35fb719d0463214f80fb004e33d9958",
    timestamp: 1790817000000,
  },
};

export function getUndeterminedReviews(): Record<string, UndeterminedInfo> {
  if (typeof window === "undefined") return DEFAULT_UNDETERMINED;
  try {
    const raw = localStorage.getItem(UNDETERMINED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, UndeterminedInfo>) : {};
    return { ...DEFAULT_UNDETERMINED, ...parsed };
  } catch {
    return DEFAULT_UNDETERMINED;
  }
}

export function markUndeterminedReview(
  bountyId: number | string,
  submissionId: number | string,
  reason: string,
  txHash?: string,
) {
  if (typeof window === "undefined") return;
  try {
    const current = getUndeterminedReviews();
    const key = `${bountyId}:${submissionId}`;
    current[key] = {
      reason,
      txHash,
      timestamp: Date.now(),
    };
    localStorage.setItem(UNDETERMINED_STORAGE_KEY, JSON.stringify(current));
    if (txHash) {
      saveReviewTx(bountyId, submissionId, txHash);
    }
  } catch {
    // Ignore storage errors
  }
}

const REVIEW_TX_STORAGE_KEY = "proofpay_review_tx_map";

const DEFAULT_REVIEW_TX_MAP: Record<string, string> = {
  "5:1": "0x1198b69a143588b66823559e5c0d2b83b35fb719d0463214f80fb004e33d9958",
};

export function getReviewTxMap(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_REVIEW_TX_MAP;
  try {
    const raw = localStorage.getItem(REVIEW_TX_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return { ...DEFAULT_REVIEW_TX_MAP, ...parsed };
  } catch {
    return DEFAULT_REVIEW_TX_MAP;
  }
}

export function saveReviewTx(
  bountyId: number | string,
  submissionId: number | string,
  txHash: string,
) {
  if (typeof window === "undefined") return;
  try {
    const current = getReviewTxMap();
    current[`${bountyId}:${submissionId}`] = txHash;
    localStorage.setItem(REVIEW_TX_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}


