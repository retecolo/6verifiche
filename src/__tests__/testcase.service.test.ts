import { describe, it, expect } from "vitest";
import { testPrisma } from "./setup";

import {
  getTestCases,
  getAllTestCases,
  getTestCaseById,
  createTestCase,
  upsertTestCase,
  updateTestCase,
  deleteTestCase,
} from "@/lib/testcase.service";

const SAMPLE = { category: "Routing", name: "OSPFv3", description: "Verify OSPFv3 adjacency" };

describe("testcase.service", () => {
  it("createTestCase stores and returns the record", async () => {
    const tc = await createTestCase(SAMPLE);
    expect(tc.id).toBeDefined();
    expect(tc.name).toBe("OSPFv3");
    expect(tc.category).toBe("Routing");
  });

  it("getAllTestCases returns sorted list", async () => {
    await createTestCase({ category: "B", name: "Z", description: "d" });
    await createTestCase({ category: "A", name: "A", description: "d" });
    const all = await getAllTestCases();
    expect(all[0].category).toBe("A");
  });

  it("getTestCases returns paginated results", async () => {
    for (let i = 0; i < 5; i++) {
      await createTestCase({ category: "Cat", name: `Test${i}`, description: "desc" });
    }
    const { testCases, total } = await getTestCases(1, 3);
    expect(testCases.length).toBe(3);
    expect(total).toBe(5);
  });

  it("getTestCaseById returns null for unknown id", async () => {
    expect(await getTestCaseById("nope")).toBeNull();
  });

  it("upsertTestCase creates if absent", async () => {
    const tc = await upsertTestCase(SAMPLE);
    expect(tc.id).toBeDefined();
  });

  it("upsertTestCase updates description if name+category exist", async () => {
    await createTestCase(SAMPLE);
    const updated = await upsertTestCase({ ...SAMPLE, description: "Updated desc" });
    expect(updated.description).toBe("Updated desc");
    expect(await testPrisma.testCase.count()).toBe(1);
  });

  it("updateTestCase modifies description", async () => {
    const tc = await createTestCase(SAMPLE);
    const updated = await updateTestCase(tc.id, { description: "New desc" });
    expect(updated.description).toBe("New desc");
    expect(updated.name).toBe("OSPFv3");
  });

  it("deleteTestCase removes the record", async () => {
    const tc = await createTestCase(SAMPLE);
    await deleteTestCase(tc.id);
    expect(await getTestCaseById(tc.id)).toBeNull();
  });
});
