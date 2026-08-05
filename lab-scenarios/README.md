# OCNOS IPv6 Lab Scenarios — IP Infusion OCNOS vs. Juniper MX204

Nine independent lab scenarios covering all 77 IPv6 compliance test cases.
Each scenario runs from a clean configuration slate on the OCNOS DUT and three Juniper MX204 peers connected at 100G.

## Physical Lab Topology

```
                    ┌─────────────────────────────────────────────┐
                    │           OCNOS DUT (IP Infusion)            │
                    │  lo0: 2001:db8:0::1/128                      │
                    │  mgmt0: 2001:db8:mgmt::10/64                 │
                    └──────────┬──────────┬──────────┬─────────────┘
                          et-0/0/0   et-0/0/1   et-0/0/2
                          100G       100G       100G
                    2001:db8:12::/127 2001:db8:13::/127 2001:db8:14::/127
                               │         │              │
                      ┌────────▼──┐ ┌────▼──────┐ ┌───▼───────┐
                      │  MX204-1  │ │  MX204-2  │ │  MX204-3  │
                      │ lo::1::1  │ │ lo::2::1  │ │ lo::3::1  │
                      └───────────┘ └───────────┘ └───────────┘

  Management network: 2001:db8:mgmt::/64
  All P2P links: /127 per RFC 6164
  All underlay IGP: IS-IS Level-2, IPv6-only (unless otherwise noted per scenario)
```

## Scenario Index

| # | Scenario | Key Protocols | Tests | File |
|---|---|---|---|---|
| 1 | Management & Core IPv6 | SSH, RADIUS, TACACS+, Syslog, SNMP, NTP, DNS, ICMPv6/ND, SLAAC, DHCPv6, PMTUD, RA suppression | 13 | [scenario-01-management-core.md](scenario-01-management-core.md) |
| 2 | IGP Routing | OSPFv3, IS-IS (IPv6 AF), RIPng, BFD, ECMP, LFA, Extension Headers, Flow Label | 8 | [scenario-02-igp-routing.md](scenario-02-igp-routing.md) |
| 3 | MP-BGP & Advanced Routing | MP-BGP (eBGP+iBGP), ADD-PATH, BGP-LU, RFC 8950 (IPv4 NLRI/IPv6 NH), NSF/GR, E2E validation | 7 | [scenario-03-mp-bgp-advanced.md](scenario-03-mp-bgp-advanced.md) |
| 4 | MPLS Label Switching | LDPoIPv6, 6PE, 6VPE, MPLS BFD, RSVP-TE, SR-MPLS/IPv6-CP, LDP Pseudowires | 7 | [scenario-04-mpls-label-switching.md](scenario-04-mpls-label-switching.md) |
| 5 | SRv6 | H.Encaps/H.Insert, End/End.X/End.DX6/End.DT6, L3VPN, TE Policy, IS-IS/OSPFv3 exts, uSID, OAM | 8 | [scenario-05-srv6.md](scenario-05-srv6.md) |
| 6 | Overlays & EVPN | VXLANv6 unicast, VXLAN EVPN, IRB L3GW, ES-LAG multi-homing, GENEVE | 5 | [scenario-06-overlays-evpn.md](scenario-06-overlays-evpn.md) |
| 7 | Multicast & HA | MLDv2, PIM-SM, PIM-SSM, mVPN/NG-mVPN, mLDP, VRRPv3, NSF/GR, ECMP, LFA | 9 | [scenario-07-multicast-ha.md](scenario-07-multicast-ha.md) |
| 8 | Security | IPv6 ACLs, FHS (RA Guard/ND Inspect/DHCPv6 Guard), dual-stack ACL, ASIC datapath, CoPP, uRPF, MACsec, MKA, Transition | 10 | [scenario-08-security.md](scenario-08-security.md) |
| 9 | Management APIs & VPN | NETCONF, RESTCONF, gNMI, OpenConfig, gRIBI, IPsec IKEv2, GREv6, L2TPv3, Certifications, Telnet | 10 | [scenario-09-management-apis-vpn.md](scenario-09-management-apis-vpn.md) |
| | **Total** | | **77** | |

## Test Case Coverage by Compliance Category

| Compliance Category | Test Cases | Scenarios |
|---|---|---|
| Network Management & Telemetry | SSH, Telnet, RADIUS, TACACS+, Syslog, SNMP, NetFlow, NTP, DNS | 1, 9 |
| Core IPv6 Protocols & Features | ICMPv6/ND, Addressing/SLAAC, Ext Headers, PMTUD, Flow Label, DHCPv6 Relay, DHCPv6-PD Relay, RA Suppression, RA Options, PREF64 | 1, 2 |
| IPv6 Routing & Forwarding | RIPng, OSPFv3, IS-IS, MP-BGP, ADD-PATH, BGP-LU, RFC 8950 | 2, 3 |
| Security, Transition & Hardware | ACLs, Dual-stack ACL, Egress ACL, ASIC Datapath, Transition, CoPP, uRPF | 8 |
| Connectivity & Validation | E2E Traffic, Log/Monitor, Certifications | 3, 9 |
| MPLS & Label Switching | 6PE, 6VPE, LDPoIPv6, MPLS BFD, RSVP-TE | 4 |
| Segment Routing | SRv6 Encap, Endpoint Behaviors, L3VPN, TE Policy, IS-IS Ext, OSPFv3 Ext, uSID, OAM, SR-MPLS | 4, 5 |
| Overlay Networks & EVPN | VXLANv6, VXLAN EVPN, GENEVE, IRB, ES-LAG | 6 |
| IPv6 Multicast | MLDv2, PIM-SM, PIM-SSM, mVPN, mLDP | 7 |
| High Availability & Resiliency | BFD, VRRPv3, NSF/GR, ECMP, LFA | 2, 3, 7 |
| Link Security (MACsec) | MACsec, MKA, MACsec+SRv6/VXLAN | 8 |
| Modern Management APIs & Telemetry | NETCONF, RESTCONF, gNMI, OpenConfig, gRIBI | 9 |
| VPN & Tunneling | IPsec IKEv2, GREv6, L2TPv3, MPLS PW | 4, 9 |

## Address Plan Summary

| Block | Purpose |
|---|---|
| 2001:db8:0::1/128 | OCNOS Loopback0 |
| 2001:db8:1::1/128 | MX204-1 Loopback |
| 2001:db8:2::1/128 | MX204-2 Loopback |
| 2001:db8:3::1/128 | MX204-3 Loopback |
| 2001:db8:12::/127 | OCNOS ↔ MX204-1 P2P |
| 2001:db8:13::/127 | OCNOS ↔ MX204-2 P2P |
| 2001:db8:14::/127 | OCNOS ↔ MX204-3 P2P |
| 2001:db8:mgmt::/64 | Out-of-band management (NTP/Syslog/SNMP/RADIUS/TACACS+) |
| fcbb:0:1::/48 | SRv6 locator — OCNOS |
| fcbb:0:2::/48 | SRv6 locator — MX204-1 |
| fcbb:0:3::/48 | SRv6 locator — MX204-2 |
| fcbb:0:4::/48 | SRv6 locator — MX204-3 |
| 2001:db8:a::/48 | 6PE/6VPE customer prefix |
| 2001:db8:overlay::/48 | EVPN IRB overlay |
| 2001:db8:cafe::/48 | SRv6 VPN customer prefix |
| 2001:db8:ipsec::/127 | IPsec tunnel inner addresses |
| 2001:db8:gre::/127 | GRE tunnel inner addresses |

## Running Order Recommendation

Run scenarios in order 1 → 9. Each scenario assumes basic IPv6 adjacency is working (validated by scenario 1's ICMPv6/ND tests). Scenarios 4–5 (MPLS/SRv6) assume IS-IS is functional (scenario 2). Scenario 6 (EVPN) assumes BGP is working (scenario 3).

## Notes on OCNOS-Specific Syntax

- OCNOS uses VyOS/FRR-derived CLI for some features. Interface names follow Linux conventions (`et-0/0/0`, `mgmt0`).
- MACsec configuration syntax follows IOS-XE style on OCNOS; adjust to actual OCNOS CLI from release notes.
- gNMI/gRPC port and TLS configuration may differ by OCNOS release — confirm port 9339 in `show gnmi status`.
- SRv6 uSID and BGP-SRv6 VPN syntax: verify against OCNOS SRv6 feature guide for the specific release under test.
- All MX204 configs use Junos `set` syntax for the candidate configuration.
