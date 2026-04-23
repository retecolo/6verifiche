import { describe, it, expect } from "vitest";
import { createPlatform } from "@/lib/platform.service";
import {
  createConfigSnapshot,
  getConfigSnapshots,
  getConfigSnapshotById,
  deleteConfigSnapshot,
} from "@/lib/config.service";

const PLATFORM = { vendor: "Juniper", modelName: "MX480", osVersion: "JunOS 23.2" };
const CONTENT = `\
version 23.2R1.14;
system {
  host-name router1;
  login { user admin { class super-user; } }
  services { ssh; }
}
routing-options { autonomous-system 64512; }
protocols {
  ospf3 { area 0.0.0.0 { interface ge-0/0/0.0; } }
  bgp { group ibgp { type internal; neighbor 2001:db8::1; } }
}
`;

describe("config.service", () => {
  it("createConfigSnapshot stores and returns the record", async () => {
    const p = await createPlatform(PLATFORM);
    const snap = await createConfigSnapshot(p.id, {
      filename: "router1.cfg",
      content: CONTENT,
    });
    expect(snap.id).toBeDefined();
    expect(snap.filename).toBe("router1.cfg");
    expect(snap.platformId).toBe(p.id);
  });

  it("getConfigSnapshots returns all snapshots for the platform", async () => {
    const p = await createPlatform(PLATFORM);
    await createConfigSnapshot(p.id, { filename: "first.cfg", content: "a" });
    await createConfigSnapshot(p.id, { filename: "second.cfg", content: "b" });
    const snaps = await getConfigSnapshots(p.id);
    expect(snaps.length).toBe(2);
    const names = snaps.map((s) => s.filename);
    expect(names).toContain("first.cfg");
    expect(names).toContain("second.cfg");
  });

  it("getConfigSnapshots returns empty list for platform with no configs", async () => {
    const p = await createPlatform(PLATFORM);
    const snaps = await getConfigSnapshots(p.id);
    expect(snaps).toEqual([]);
  });

  it("getConfigSnapshotById returns the snapshot with content", async () => {
    const p = await createPlatform(PLATFORM);
    const snap = await createConfigSnapshot(p.id, { filename: "r.cfg", content: CONTENT });
    const found = await getConfigSnapshotById(snap.id);
    expect(found?.content).toBe(CONTENT);
    expect(found?.filename).toBe("r.cfg");
  });

  it("getConfigSnapshotById returns null for unknown id", async () => {
    expect(await getConfigSnapshotById("nonexistent")).toBeNull();
  });

  it("deleteConfigSnapshot removes the record", async () => {
    const p = await createPlatform(PLATFORM);
    const snap = await createConfigSnapshot(p.id, { filename: "x.cfg", content: "x" });
    await deleteConfigSnapshot(snap.id);
    expect(await getConfigSnapshotById(snap.id)).toBeNull();
  });
});
