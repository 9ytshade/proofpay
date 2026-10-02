import { describe, expect, it, vi, afterEach } from "vitest";
import {
  checkContractVersionCompatibility,
  discoverFinalBounties,
  formatGen,
  genLayerTransactionUrl,
  proofPayChainId,
  setContractReaderForTesting,
  shortAddress,
} from "./genlayer";
import { parseDeadlineToUtcPreview } from "./safety";
import {
  describe as describeTx,
  extractContractError,
} from "../components/transaction-lifecycle";
import {
  getDisplayStatus,
  type ReviewRecord,
} from "../components/review-desk";

describe("Critical Frontend Flows Test Suite", () => {
  afterEach(() => {
    setContractReaderForTesting(null);
    vi.restoreAllMocks();
  });

  describe("1. Bounty Discovery & Newest-First Ordering", () => {
    it("discovers newest bounty IDs first when total exceeds 100", async () => {
      setContractReaderForTesting(async (method: string, args: unknown[]) => {
        if (method === "get_bounty_count") return 150;
        if (method === "get_bounty") {
          const id = args[0] as number;
          return { id, title: `Bounty #${id}`, brief: "Outcome", reward: "100", status: "open" };
        }
        return null;
      });

      // Default batch limit is 50/100, let's request limit: 50, offset: 0
      const result = await discoverFinalBounties({ offset: 0, limit: 50 });

      expect(result.totalCount).toBe(150);
      expect(result.loadedCount).toBe(50);
      expect(result.failedIds).toEqual([]);
      expect(result.hasMore).toBe(true);

      // Verify newest-first: first item should be ID 150, last should be ID 101
      const firstBounty = result.bounties[0] as { id: number };
      const lastBounty = result.bounties[result.bounties.length - 1] as { id: number };
      expect(firstBounty.id).toBe(150);
      expect(lastBounty.id).toBe(101);
    });

    it("supports pagination with offset and limit", async () => {
      setContractReaderForTesting(async (method: string, args: unknown[]) => {
        if (method === "get_bounty_count") return 150;
        if (method === "get_bounty") {
          const id = args[0] as number;
          return { id, title: `Bounty #${id}` };
        }
        return null;
      });

      // Page 2: offset 50, limit 50 -> IDs 100 down to 51
      const page2 = await discoverFinalBounties({ offset: 50, limit: 50 });
      expect(page2.totalCount).toBe(150);
      expect(page2.loadedCount).toBe(50);
      expect((page2.bounties[0] as { id: number }).id).toBe(100);
      expect((page2.bounties[page2.bounties.length - 1] as { id: number }).id).toBe(51);
      expect(page2.hasMore).toBe(true);

      // Page 3: offset 100, limit 50 -> IDs 50 down to 1
      const page3 = await discoverFinalBounties({ offset: 100, limit: 50 });
      expect(page3.loadedCount).toBe(50);
      expect((page3.bounties[0] as { id: number }).id).toBe(50);
      expect((page3.bounties[page3.bounties.length - 1] as { id: number }).id).toBe(1);
      expect(page3.hasMore).toBe(false);
    });

    it("handles zero bounties gracefully", async () => {
      setContractReaderForTesting(async () => 0);

      const result = await discoverFinalBounties();
      expect(result.totalCount).toBe(0);
      expect(result.bounties).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.failedIds).toEqual([]);
    });
  });

  describe("2. Partial RPC Read Failures and Targeted Retry", () => {
    it("tracks failed IDs instead of silently dropping records", async () => {
      setContractReaderForTesting(async (method: string, args: unknown[]) => {
        if (method === "get_bounty_count") return 5;
        if (method === "get_bounty") {
          const id = args[0] as number;
          // Simulate transient RPC error on ID 4 and ID 2
          if (id === 4 || id === 2) {
            throw new Error("RPC 503 Service Unavailable");
          }
          return { id, title: `Bounty #${id}` };
        }
        return null;
      });

      const result = await discoverFinalBounties({ offset: 0, limit: 5 });

      expect(result.totalCount).toBe(5);
      expect(result.bounties.length).toBe(3);
      // Failed IDs must be tracked explicitly
      expect(result.failedIds).toContain(4);
      expect(result.failedIds).toContain(2);
      expect(result.failedIds.length).toBe(2);
    });

    it("allows retrying only the failed record IDs", async () => {
      const queriedIds: number[] = [];

      setContractReaderForTesting(async (method: string, args: unknown[]) => {
        if (method === "get_bounty") {
          const id = args[0] as number;
          queriedIds.push(id);
          return { id, title: `Recovered Bounty #${id}` };
        }
        return null;
      });

      const retryResult = await discoverFinalBounties({ specificIds: [4, 2] });

      expect(queriedIds).toEqual([4, 2]);
      expect(retryResult.bounties.length).toBe(2);
      expect(retryResult.failedIds).toEqual([]);
    });
  });

  describe("3. Deadline Time-Zone Conversion", () => {
    it("converts local datetime input to transparent UTC representation and unix seconds", () => {
      // Input from <input type="datetime-local">
      const localInput = "2026-10-15T15:30";
      const preview = parseDeadlineToUtcPreview(localInput);

      expect(preview).not.toBeNull();
      if (!preview) return;

      expect(preview.utc).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
      expect(Number.isInteger(preview.unix)).toBe(true);

      const expectedDate = new Date(localInput);
      expect(preview.unix).toBe(Math.floor(expectedDate.getTime() / 1000));
      expect(preview.local).toBe(expectedDate.toLocaleString());
    });

    it("returns null for empty or invalid deadline inputs", () => {
      expect(parseDeadlineToUtcPreview("")).toBeNull();
      expect(parseDeadlineToUtcPreview("invalid-date-string")).toBeNull();
    });
  });

  describe("4. Wallet and Network Handling", () => {
    it("targets GenLayer Studionet chain 61999", () => {
      expect(proofPayChainId).toBe(61999);
    });

    it("formats explorer URLs for Studionet transactions", () => {
      const sampleTx = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      expect(genLayerTransactionUrl(sampleTx)).toBe(`https://explorer-studio.genlayer.com/tx/${sampleTx}`);
    });

    it("formats addresses cleanly with shortAddress", () => {
      expect(shortAddress("0x5CCe24450B88BFC705794830C717c2D511253bF5")).toBe("0x5CCe…3bF5");
    });

    it("formats GEN values accurately from wei strings", () => {
      expect(formatGen("1000000000000000000")).toBe("1");
      expect(formatGen("2500000000000000000")).toBe("2.5");
      expect(formatGen("100000000000000000")).toBe("0.1");
    });

    it("validates contract version 2.0.0 compatibility", async () => {
      setContractReaderForTesting(async () => "2.0.0");
      const okCheck = await checkContractVersionCompatibility();
      expect(okCheck.compatible).toBe(true);
      expect(okCheck.version).toBe("2.0.0");

      setContractReaderForTesting(async () => "1.0.0");
      const badCheck = await checkContractVersionCompatibility();
      expect(badCheck.compatible).toBe(false);
      expect(badCheck.error).toContain("requires version \"2.0.0\"");

      setContractReaderForTesting(async () => {
        throw new Error("RPC Connection Error");
      });
      const errCheck = await checkContractVersionCompatibility();
      expect(errCheck.compatible).toBe(false);
      expect(errCheck.error).toContain("RPC Connection Error");
    });
  });

  describe("5. Transaction Finalization, Rollback & Terminal State Handling", () => {
    it("identifies successful finalized transactions", () => {
      const tx = {
        statusName: "FINALIZED",
        resultName: "SUCCESS",
      };
      const state = describeTx(tx);
      expect(state.done).toBe(true);
      expect(state.failed).toBe(false);
      expect(state.detail).toContain("durable public record");
    });

    it("detects contract execution rollback in leader receipts", () => {
      const txWithRollback = {
        statusName: "FINALIZED",
        consensus_data: {
          leader_receipt: [
            {
              execution_result: "ERROR",
              result: {
                status: "rollback",
                payload: "Deadline has passed for this bounty",
              },
            },
          ],
        },
      };

      const errorInfo = extractContractError(txWithRollback);
      expect(errorInfo.isError).toBe(true);
      expect(errorInfo.message).toBe("Deadline has passed for this bounty");

      const state = describeTx(txWithRollback);
      expect(state.done).toBe(true);
      expect(state.failed).toBe(true);
      expect(state.errorReason).toBe("Deadline has passed for this bounty");
    });

    it("detects and decodes base64-encoded rollback payloads", () => {
      // Base64 encoding of "\x01Only the bounty client can call this"
      const payloadText = "Only the bounty client can call this";
      const b64 = btoa(String.fromCharCode(1) + payloadText);

      const txWithB64Rollback = {
        statusName: "FINALIZED",
        consensus_data: {
          leader_receipt: [
            {
              execution_result: "ERROR",
              result: b64,
            },
          ],
        },
      };

      const errorInfo = extractContractError(txWithB64Rollback);
      expect(errorInfo.isError).toBe(true);
      expect(errorInfo.message).toBe(payloadText);
    });

    it("detects terminal timeout and undetermined states", () => {
      for (const terminalStatus of ["UNDETERMINED", "CANCELED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"]) {
        const state = describeTx({ statusName: terminalStatus });
        expect(state.done).toBe(true);
        expect(state.failed).toBe(true);
      }
    });

    it("keeps in-flight consensus states marked as not done", () => {
      for (const inFlight of ["PENDING", "PROPOSING", "COMMITTING", "REVEALING", "ACCEPTED"]) {
        const state = describeTx({ statusName: inFlight });
        expect(state.done).toBe(false);
        expect(state.failed).toBe(false);
      }
    });
  });

  describe("6. Approved, Rejected, and Undetermined Review States", () => {
    const baseRecord: ReviewRecord = {
      bounty: {
        id: 1,
        title: "Build widget",
        reward: "1000000000000000000",
        status: "open",
        submission_count: 1,
        approved_submission_id: 0,
      },
      submission: {
        bounty_id: 1,
        submission_id: 1,
        builder: "0x1111111111111111111111111111111111111111",
        repository_url: "https://github.com/org/repo/commit/0000000000000000000000000000000000000000",
        deployment_url: "https://example.com/",
        summary: "Delivered widget",
        status: "submitted",
        score: 0,
        reason: "",
        verdict_id: 0,
      },
    };

    it("evaluates default unreviewed state as submitted", () => {
      expect(getDisplayStatus(baseRecord, {})).toBe("submitted");
    });

    it("evaluates APPROVED outcome correctly", () => {
      const approvedRecord: ReviewRecord = {
        ...baseRecord,
        verdict: {
          approved: true,
          required_criteria_passed: true,
          outcome: "APPROVED",
          score: 100,
          criteria_report: "All 3 criteria passed",
          reason: "Meets every requirement",
        },
      };
      expect(getDisplayStatus(approvedRecord, {})).toBe("approved");

      // Also if submission.status is 'approved'
      const approvedSubmission: ReviewRecord = {
        ...baseRecord,
        submission: { ...baseRecord.submission, status: "approved" },
      };
      expect(getDisplayStatus(approvedSubmission, {})).toBe("approved");
    });

    it("evaluates REJECTED outcome correctly when any criterion fails", () => {
      const rejectedRecord: ReviewRecord = {
        ...baseRecord,
        verdict: {
          approved: false,
          required_criteria_passed: false,
          outcome: "REJECTED",
          score: 66,
          criteria_report: "Criterion 2 failed",
          reason: "Live deployment missing HTTPS",
        },
      };
      expect(getDisplayStatus(rejectedRecord, {})).toBe("rejected");

      // Also if submission.status is 'rejected'
      const rejectedSubmission: ReviewRecord = {
        ...baseRecord,
        submission: { ...baseRecord.submission, status: "rejected" },
      };
      expect(getDisplayStatus(rejectedSubmission, {})).toBe("rejected");
    });

    it("evaluates UNDETERMINED outcome correctly", () => {
      const undeterminedRecord: ReviewRecord = {
        ...baseRecord,
        verdict: {
          approved: false,
          required_criteria_passed: false,
          outcome: "UNDETERMINED",
          score: 0,
          criteria_report: "Transient upstream 429",
          reason: "Rate limited while checking deployment",
        },
      };
      expect(getDisplayStatus(undeterminedRecord, {})).toBe("undetermined");
    });

    it("evaluates net-failure when transient transaction failure is recorded in map", () => {
      const undeterminedMap = {
        "1:1": {
          txHash: "0xabc",
          bountyId: 1,
          submissionId: 1,
          status: "FAILED",
          reason: "RPC timeout",
          timestamp: Date.now(),
        },
      };
      expect(getDisplayStatus(baseRecord, undeterminedMap)).toBe("net-failure");
    });
  });
});
