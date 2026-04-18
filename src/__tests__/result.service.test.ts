import { describe, it, expect } from "vitest";
import { testPrisma } from "./setup";

import {
  getResults,
  getResultById,
  getPlatformResultMatrix,
  upsertResult,
  updateResult,
  deleteResult,
} from "@/lib/result.service";

async function seed() {
  const platform = await testPrisma.platform.create({
    data: { vendor: "Arista", modelName: "7050X3", osVersion: "EOS 4.30" },
  });
  const testCase = await testPrisma.testCase.create({
    data: { category: "Routing", name: "OSPFv3", description: "Test OSPFv3" },
  });
  return { platform, testCase };
}

describe("result.service", () => {
  it("upsertResult creates a new result", async () => {
    const { platform, testCase } = await seed();
    const result = await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "PASS" });
    expect(result.status).toBe("PASS");
    expect(result.detail).toBeNull();
  });

  it("upsertResult updates existing result", async () => {
    const { platform, testCase } = await seed();
    await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "PASS" });
    const updated = await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "FAIL", detail: "Adjacency did not form" });
    expect(updated.status).toBe("FAIL");
    expect(updated.detail).toBe("Adjacency did not form");
    expect(await testPrisma.testResult.count()).toBe(1);
  });

  it("getResults returns paginated list", async () => {
    const { platform, testCase } = await seed();
    await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "PASS" });
    const { results, total } = await getResults(1, 10);
    expect(results.length).toBe(1);
    expect(total).toBe(1);
  });

  it("getResultById returns null for unknown id", async () => {
    expect(await getResultById("nope")).toBeNull();
  });

  it("getPlatformResultMatrix shows all test cases with null results for new platforms", async () => {
    const { platform } = await seed();
    const matrix = await getPlatformResultMatrix(platform.id);
    expect(matrix.length).toBe(1);
    expect(matrix[0].result).toBeNull();
  });

  it("getPlatformResultMatrix fills in recorded results", async () => {
    const { platform, testCase } = await seed();
    await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "PARTIAL" });
    const matrix = await getPlatformResultMatrix(platform.id);
    expect(matrix[0].result?.status).toBe("PARTIAL");
  });

  it("updateResult changes status and detail", async () => {
    const { platform, testCase } = await seed();
    const r = await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "PASS" });
    const updated = await updateResult(r.id, { status: "FAIL", detail: "Failed" });
    expect(updated.status).toBe("FAIL");
    expect(updated.detail).toBe("Failed");
  });

  it("deleteResult removes the record", async () => {
    const { platform, testCase } = await seed();
    const r = await upsertResult({ platformId: platform.id, testCaseId: testCase.id, status: "PASS" });
    await deleteResult(r.id);
    expect(await getResultById(r.id)).toBeNull();
  });
});
