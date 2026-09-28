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

export function isPublicGithubUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

export function isFutureUnixTimestamp(timestamp: number, nowMilliseconds = Date.now()) {
  return Number.isFinite(timestamp) && timestamp > Math.floor(nowMilliseconds / 1000);
}
