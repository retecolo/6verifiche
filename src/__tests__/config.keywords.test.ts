import { describe, it, expect } from "vitest";
import { findMatchingLines } from "@/lib/config.keywords";

const SAMPLE_CONFIG = `version 23.2R1.14;
system {
  host-name mx480;
  services { ssh; telnet; }
  ntp { server 2001:db8::1; }
  syslog { host 2001:db8::10; }
  radius-server 2001:db8::20 secret "secret";
}
protocols {
  ospf3 { area 0.0.0.0 { interface ge-0/0/0.0; } }
  bgp {
    group ibgp { type internal; neighbor 2001:db8::1; }
    address-family ipv6 unicast;
  }
  isis { interface ge-0/0/1.0; address-family ipv6; }
}
ipv6 { address 2001:db8:1::1/64; }
`;

describe("findMatchingLines", () => {
  it("returns empty array for unknown test case name", () => {
    expect(findMatchingLines(SAMPLE_CONFIG, "Nonexistent Test")).toEqual([]);
  });

  it("finds SSH lines", () => {
    const lines = findMatchingLines(SAMPLE_CONFIG, "SSH (SSHv2)");
    expect(lines.length).toBeGreaterThan(0);
    // line 4 contains "ssh"
    expect(lines).toContain(4);
  });

  it("finds OSPFv3 lines", () => {
    const lines = findMatchingLines(SAMPLE_CONFIG, "OSPFv3");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((n) => n >= 9 && n <= 11)).toBe(true);
  });

  it("finds NTP lines", () => {
    const lines = findMatchingLines(SAMPLE_CONFIG, "NTP");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("finds BGP lines", () => {
    const lines = findMatchingLines(SAMPLE_CONFIG, "MP-BGP");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("finds IS-IS lines", () => {
    const lines = findMatchingLines(SAMPLE_CONFIG, "IS-IS (IPv6 Address Family)");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("returns 1-based line numbers", () => {
    const lines = findMatchingLines("ssh\nother\nntp\n", "SSH (SSHv2)");
    expect(lines).toContain(1);
    expect(lines).not.toContain(0);
  });
});
