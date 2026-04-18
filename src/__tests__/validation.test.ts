import { describe, it, expect } from "vitest";
import {
  PlatformSchema,
  TestCaseSchema,
  ResultSchema,
  ResultUpdateSchema,
  PaginationSchema,
} from "@/lib/validation";

describe("PlatformSchema", () => {
  it("accepts valid input", () => {
    const result = PlatformSchema.safeParse({ vendor: "Arista", modelName: "7050X3", osVersion: "EOS 4.30" });
    expect(result.success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = PlatformSchema.parse({ vendor: " Arista ", modelName: "7050X3 ", osVersion: " EOS " });
    expect(result.vendor).toBe("Arista");
  });

  it("rejects empty vendor", () => {
    expect(PlatformSchema.safeParse({ vendor: "", modelName: "m", osVersion: "v" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(PlatformSchema.safeParse({ vendor: "Arista" }).success).toBe(false);
  });

  it("rejects vendor longer than 100 chars", () => {
    expect(PlatformSchema.safeParse({ vendor: "a".repeat(101), modelName: "m", osVersion: "v" }).success).toBe(false);
  });
});

describe("TestCaseSchema", () => {
  it("accepts valid input", () => {
    const result = TestCaseSchema.safeParse({ category: "Routing", name: "OSPFv3", description: "Test OSPFv3 adjacency" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(TestCaseSchema.safeParse({ category: "Routing", name: "", description: "desc" }).success).toBe(false);
  });

  it("rejects description over 2000 chars", () => {
    expect(TestCaseSchema.safeParse({ category: "c", name: "n", description: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("ResultSchema", () => {
  it("accepts PASS status", () => {
    expect(ResultSchema.safeParse({ platformId: "cltest123456789012345678", testCaseId: "cltest123456789012345679", status: "PASS" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(ResultSchema.safeParse({ platformId: "cltest123456789012345678", testCaseId: "cltest123456789012345679", status: "MAYBE" }).success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["PASS", "FAIL", "PARTIAL", "N/A"]) {
      expect(ResultSchema.safeParse({ platformId: "cltest123456789012345678", testCaseId: "cltest123456789012345679", status }).success).toBe(true);
    }
  });
});

describe("ResultUpdateSchema", () => {
  it("accepts status only", () => {
    expect(ResultUpdateSchema.safeParse({ status: "FAIL" }).success).toBe(true);
  });

  it("accepts status with detail", () => {
    expect(ResultUpdateSchema.safeParse({ status: "PARTIAL", detail: "Some notes" }).success).toBe(true);
  });
});

describe("PaginationSchema", () => {
  it("uses defaults", () => {
    const result = PaginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it("coerces strings to numbers", () => {
    expect(PaginationSchema.parse({ page: "2", limit: "10" })).toEqual({ page: 2, limit: 10 });
  });

  it("rejects limit over 200", () => {
    expect(PaginationSchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it("rejects page 0", () => {
    expect(PaginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});
