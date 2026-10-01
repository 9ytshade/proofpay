import { proofPayContractAddress } from "./genlayer";

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

export function isAllowedEvidenceFile(path: string): boolean {
  const lower = path.toLowerCase();
  const allowedExtensions = [
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".txt",
    ".html", ".css", ".scss", ".sass", ".less", ".yaml", ".yml", ".toml", ".sol",
    ".rs", ".go", ".java", ".kt", ".sh", ".ps1", ".sql", ".vue", ".svelte",
  ];
  if (allowedExtensions.some((ext) => lower.endsWith(ext))) {
    return true;
  }

  const basename = lower.split("/").pop() ?? "";
  const allowedBasenames = ["dockerfile", "makefile", "readme", "license", ".env.example"];
  return allowedBasenames.includes(basename);
}

export function validateEvidencePaths(value: string): { valid: boolean; error?: string; paths: string[] } {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return { valid: false, error: "Provide at least one source evidence path.", paths: [] };
  }
  if (cleaned.length > 1500) {
    return { valid: false, error: "Source evidence manifest is too long (maximum 1,500 characters).", paths: [] };
  }

  const rawPaths = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  if (rawPaths.length === 0 || rawPaths.length > 6) {
    return { valid: false, error: "Provide between one and six source evidence paths.", paths: [] };
  }

  const normalized: string[] = [];
  for (const path of rawPaths) {
    if (path.length > 240) {
      return { valid: false, error: `Path "${path.slice(0, 30)}…" exceeds maximum length of 240 characters.`, paths: [] };
    }
    if (path.startsWith("/") || path.endsWith("/") || /[\\?#%]/.test(path)) {
      return { valid: false, error: `Invalid source evidence path "${path}". Must be relative with no leading/trailing slashes, queries, or special characters.`, paths: [] };
    }

    const segments = path.split("/");
    for (const segment of segments) {
      if (segment === "" || segment === "." || segment === "..") {
        return { valid: false, error: `Invalid path traversal or segment in "${path}".`, paths: [] };
      }
    }

    if (!/^[a-zA-Z0-9_\-./]+$/.test(path)) {
      return { valid: false, error: `Invalid characters in source path "${path}".`, paths: [] };
    }

    if (!isAllowedEvidenceFile(path)) {
      return { valid: false, error: `Path "${path}" must reference a supported text file (.py, .ts, .tsx, .json, .md, package.json, Dockerfile, etc.).`, paths: [] };
    }

    if (normalized.includes(path)) {
      return { valid: false, error: `Duplicate source evidence path "${path}".`, paths: [] };
    }
    normalized.push(path);
  }

  return { valid: true, paths: normalized };
}

export function isFutureUnixTimestamp(timestamp: number, nowMilliseconds = Date.now()) {
  return Number.isFinite(timestamp) && timestamp > Math.floor(nowMilliseconds / 1000);
}

function getUndeterminedStorageKey() {
  return `proofpay_undetermined_${proofPayContractAddress.toLowerCase()}`;
}

export type UndeterminedInfo = {
  reason: string;
  txHash?: string;
  timestamp: number;
};

export function getUndeterminedReviews(): Record<string, UndeterminedInfo> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getUndeterminedStorageKey());
    return raw ? (JSON.parse(raw) as Record<string, UndeterminedInfo>) : {};
  } catch {
    return {};
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
    localStorage.setItem(getUndeterminedStorageKey(), JSON.stringify(current));
    if (txHash) {
      saveReviewTx(bountyId, submissionId, txHash);
    }
  } catch {
    // Ignore storage errors
  }
}

function getReviewTxStorageKey() {
  return `proofpay_review_tx_map_${proofPayContractAddress.toLowerCase()}`;
}

export function getReviewTxMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getReviewTxStorageKey());
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
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
    localStorage.setItem(getReviewTxStorageKey(), JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}
