import { describe, it, expect } from "vitest";

import {
  getPlatforms,
  getPlatformById,
  getPlatformWithResults,
  createPlatform,
  updatePlatform,
  deletePlatform,
} from "@/lib/platform.service";

const SAMPLE = { vendor: "Arista", modelName: "7050X3", osVersion: "EOS 4.30.2F" };

describe("platform.service", () => {
  it("createPlatform stores and returns the record", async () => {
    const p = await createPlatform(SAMPLE);
    expect(p.id).toBeDefined();
    expect(p.vendor).toBe("Arista");
    expect(p.modelName).toBe("7050X3");
    expect(p.osVersion).toBe("EOS 4.30.2F");
  });

  it("getPlatforms returns paginated list", async () => {
    await createPlatform(SAMPLE);
    await createPlatform({ vendor: "Cisco", modelName: "Nexus 9k", osVersion: "NXOS 10.3" });
    const { platforms, total } = await getPlatforms(1, 10);
    expect(platforms.length).toBe(2);
    expect(total).toBe(2);
  });

  it("getPlatforms respects pagination", async () => {
    for (let i = 0; i < 5; i++) {
      await createPlatform({ vendor: `V${i}`, modelName: "m", osVersion: "1.0" });
    }
    const { platforms, total } = await getPlatforms(1, 2);
    expect(platforms.length).toBe(2);
    expect(total).toBe(5);
  });

  it("getPlatformById returns null for unknown id", async () => {
    const result = await getPlatformById("nonexistent");
    expect(result).toBeNull();
  });

  it("getPlatformById returns the correct platform", async () => {
    const created = await createPlatform(SAMPLE);
    const found = await getPlatformById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it("getPlatformWithResults includes results relation", async () => {
    const p = await createPlatform(SAMPLE);
    const full = await getPlatformWithResults(p.id);
    expect(full?.results).toEqual([]);
  });

  it("updatePlatform changes only specified fields", async () => {
    const p = await createPlatform(SAMPLE);
    const updated = await updatePlatform(p.id, { osVersion: "EOS 4.31.0" });
    expect(updated.osVersion).toBe("EOS 4.31.0");
    expect(updated.vendor).toBe("Arista");
  });

  it("deletePlatform removes the record", async () => {
    const p = await createPlatform(SAMPLE);
    await deletePlatform(p.id);
    expect(await getPlatformById(p.id)).toBeNull();
  });
});
