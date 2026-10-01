import { describe, expect, it } from "vitest";
import { isFutureUnixTimestamp, isHttpsUrl, isPublicGithubCommitUrl, normalizeHttpsUrl, parseGenToWei } from "./safety";
import { genLayerTransactionUrl } from "./genlayer";

describe("ProofPay client safety rules", () => {
  it("converts whole and fractional GEN precisely to wei", () => {
    expect(parseGenToWei("10")).toBe(BigInt("10000000000000000000"));
    expect(parseGenToWei("0.125")).toBe(BigInt("125000000000000000"));
    expect(parseGenToWei("1.000000000000000001")).toBe(BigInt("1000000000000000001"));
  });

  it("rejects unsafe escrow amounts before the wallet opens", () => {
    for (const value of ["", "-1", "1e3", ".5", "1.1234567890123456789", "one"]) {
      expect(() => parseGenToWei(value)).toThrow("GEN amount");
    }
  });

  it("requires HTTPS evidence URLs", () => {
    expect(isHttpsUrl("https://proofpay.example")).toBe(true);
    expect(isHttpsUrl("http://proofpay.example")).toBe(false);
    expect(isHttpsUrl("not a url")).toBe(false);
  });

  it("normalizes bare HTTPS domains with a trailing slash for contract compatibility", () => {
    expect(normalizeHttpsUrl("https://example.com")).toBe("https://example.com/");
    expect(normalizeHttpsUrl("https://example.com/app")).toBe("https://example.com/app");
    expect(normalizeHttpsUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("requires a canonical full GitHub commit permalink", () => {
    const commitSha = "a".repeat(40);
    expect(isPublicGithubCommitUrl(`https://github.com/vercel/next.js/commit/${commitSha}`)).toBe(true);
    expect(isPublicGithubCommitUrl(`https://github.com/vercel/next.js/commit/${commitSha.toUpperCase()}`)).toBe(true);

    for (const value of [
      "https://github.com/vercel/next.js",
      "https://github.com/vercel/next.js/tree/main",
      "https://github.com/vercel",
      `https://github.com/vercel/next.js/commit/${commitSha.slice(0, 8)}`,
      `https://github.com/vercel/next.js/commit/${commitSha}?tab=readme`,
      `https://github.com/vercel/next.js/commit/${commitSha}#diff`,
      `https://github.com@evil.example/vercel/next.js/commit/${commitSha}`,
      `https://github.com.evil.example/vercel/next.js/commit/${commitSha}`,
      `https://github.com/vercel/next.js/commit/${commitSha}/extra`,
      `https://github.com/vercel/repo%2Fname/commit/${commitSha}`,
      `http://github.com/vercel/next.js/commit/${commitSha}`,
    ]) {
      expect(isPublicGithubCommitUrl(value)).toBe(false);
    }
  });

  it("requires a deadline after the current time", () => {
    const now = Date.UTC(2026, 8, 28, 12, 0, 0);
    expect(isFutureUnixTimestamp(1790596801, now)).toBe(true);
    expect(isFutureUnixTimestamp(1790596800, now)).toBe(false);
  });

  it("links transaction records to the official Studionet explorer", () => {
    const hash = "0x208ce686ed1a39c7b2d765d3a23d134643294d69daf3d0276411840c9cd901e9";
    expect(genLayerTransactionUrl(hash)).toBe(`https://explorer-studio.genlayer.com/tx/${hash}`);
  });
});
