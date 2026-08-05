# Scenario 2 — IGP Routing (OSPFv3, IS-IS, BFD, ECMP, LFA)

## Coverage (8 test cases)
| Category | Test Case |
|---|---|
| IPv6 Routing & Forwarding | OSPFv3 |
| IPv6 Routing & Forwarding | IS-IS (IPv6 Address Family) |
| High Availability & Resiliency | BFD over IPv6 |
| High Availability & Resiliency | ECMP & Load Balancing for IPv6 |
| High Availability & Resiliency | IPv6 Fast Reroute (IP-FRR / LFA) |
| Core IPv6 Protocols & Features | IPv6 Extension Header Processing |
| Core IPv6 Protocols & Features | IPv6 Flow Label |
| IPv6 Routing & Forwarding | RIPng |

## Topology

```
           2001:db8:0::1/128 (Loopback)
                    │
              ┌─────▼──────┐
              │  OCNOS DUT │  Area 0 / Level-2
              └──┬───┬───┬─┘
    et-0/0/0     │   │   │  et-0/0/2
  2001:db8:12::/127  │  2001:db8:14::/127
                     │ et-0/0/1
               2001:db8:13::/127
        ┌──────┘    │    └───────┐
 ┌──────▼──┐  ┌─────▼───┐  ┌────▼─────┐
 │ MX204-1 │  │ MX204-2 │  │ MX204-3  │
 │ lo:     │  │ lo:     │  │ lo:      │
 │ 2001:db8│  │ 2001:db8│  │ 2001:db8 │
 │:1::1/128│  │:2::1/128│  │:3::1/128 │
 └─────────┘  └─────────┘  └──────────┘

ECMP: All three MX204 loopbacks reachable with three equal-cost paths.
LFA: Losing et-0/0/0 → pre-computed backup via et-0/0/1 or et-0/0/2.
BFD: 150ms timers on all three links for fast failure detection.
```

---

## OCNOS Configuration

```
! ── Interfaces ────────────────────────────────────────────────────────────────
interface et-0/0/0
 description TO-MX204-1
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127
 ipv6 ospf 1 area 0
 isis ipv6 enable
 ipv6 nd ra-suppress

interface et-0/0/1
 description TO-MX204-2
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127
 ipv6 ospf 1 area 0
 isis ipv6 enable
 ipv6 nd ra-suppress

interface et-0/0/2
 description TO-MX204-3
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127
 ipv6 ospf 1 area 0
 isis ipv6 enable
 ipv6 nd ra-suppress

interface Loopback0
 ipv6 address 2001:db8:0::1/128
 ipv6 ospf 1 area 0
 isis ipv6 enable

! ── OSPFv3 ────────────────────────────────────────────────────────────────────
ipv6 router ospf 1
 router-id 0.0.0.1
 area 0 authentication ipsec spi 256 sha1 1234567890ABCDEF1234567890ABCDEF12345678
 maximum-paths 3
 fast-reroute per-prefix lfa
 graceful-restart

! ── IS-IS ─────────────────────────────────────────────────────────────────────
router isis
 net 49.0001.0000.0000.0001.00
 is-type level-2-only
 metric-style wide
 address-family ipv6 unicast
  maximum-paths 3
  fast-reroute per-prefix
  fast-reroute per-prefix ti-lfa
 !
 graceful-restart

! ── BFD (referenced by OSPFv3 and IS-IS) ────────────────────────────────────
! BFD sessions are triggered by protocols; set global timers
bfd interval 150 min_rx 150 multiplier 3

! Bind BFD to OSPFv3
ipv6 router ospf 1
 bfd all-interfaces

! Bind BFD to IS-IS
router isis
 bfd all-interfaces

! ── RIPng ─────────────────────────────────────────────────────────────────────
ipv6 router rip RIP1
 !
interface et-0/0/0
 ipv6 rip RIP1 enable
interface et-0/0/1
 ipv6 rip RIP1 enable
interface et-0/0/2
 ipv6 rip RIP1 enable
```

---

## MX204-1 Configuration

```
set system host-name mx204-1
set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## OSPFv3
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive
set protocols ospf3 spf-options rapid-runs 3
set protocols ospf3 graceful-restart

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2
set protocols isis level 2 wide-metrics-only
set protocols isis source-packet-routing node-segment ipv6-index 101

## BFD for OSPFv3
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0 bfd-liveness-detection minimum-interval 150
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0 bfd-liveness-detection multiplier 3

## BFD for IS-IS
set protocols isis interface et-0/0/0.0 bfd-liveness-detection minimum-interval 150
set protocols isis interface et-0/0/0.0 bfd-liveness-detection multiplier 3

## RIPng
set protocols ripng group RIP neighbor et-0/0/0.0
set protocols ripng group RIP export connected-v6

## ECMP
set policy-options policy-statement LOAD-BALANCE then load-balance per-flow
set routing-options forwarding-table export LOAD-BALANCE
set routing-options maximum-paths 3
```

## MX204-2 Configuration

```
set system host-name mx204-2
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0 bfd-liveness-detection minimum-interval 150
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0 bfd-liveness-detection multiplier 3
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2
set protocols isis interface et-0/0/0.0 bfd-liveness-detection minimum-interval 150
set protocols isis interface et-0/0/0.0 bfd-liveness-detection multiplier 3
set protocols ripng group RIP neighbor et-0/0/0.0
set routing-options maximum-paths 3
set policy-options policy-statement LOAD-BALANCE then load-balance per-flow
set routing-options forwarding-table export LOAD-BALANCE
```

## MX204-3 Configuration

```
set system host-name mx204-3
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0 bfd-liveness-detection minimum-interval 150
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0 bfd-liveness-detection multiplier 3
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2
set protocols isis interface et-0/0/0.0 bfd-liveness-detection minimum-interval 150
set protocols isis interface et-0/0/0.0 bfd-liveness-detection multiplier 3
set protocols ripng group RIP neighbor et-0/0/0.0
set routing-options maximum-paths 3
set policy-options policy-statement LOAD-BALANCE then load-balance per-flow
set routing-options forwarding-table export LOAD-BALANCE
```

---

## Verification Commands & Expected Outcomes

### OSPFv3
```
show ipv6 ospf neighbor
show ipv6 ospf database
show ipv6 route ospf
```
**Expected:** Three Full adjacencies (one per MX204); intra-area routes for all loopbacks (2001:db8:1::1, 2:1, 3:1) in RIB; LSAs present in database.

### IS-IS (IPv6 AF)
```
show isis neighbors
show isis database
show isis routes ipv6
show ipv6 route isis
```
**Expected:** Three Level-2 adjacencies; IPv6 prefixes for all loopbacks advertised via IS-IS; CLNS database complete.

### BFD over IPv6
```
show bfd neighbors
show bfd neighbors details
```
**Expected:** Six BFD sessions (3×OSPFv3 + 3×IS-IS) in `Up` state; `Local Diag: No Diagnostic`; interval ~150ms.

Failure test:
```bash
# Shut et-0/0/0 on OCNOS
interface et-0/0/0
 shutdown
# Observe BFD bring down IGP adjacency within 3 × 150ms = 450ms
show bfd neighbors
show logging | include BFD
```
**Expected:** BFD session `Down` within 450ms; OSPFv3/IS-IS adjacency drops; routes removed from RIB within 500ms.

### ECMP & Load Balancing
```
show ipv6 route 2001:db8:1::1/128
show ipv6 route 2001:db8:2::1/128
show ipv6 route 2001:db8:3::1/128
show ipv6 cef 2001:db8:1::1/128 detail
show forwarding ipv6 table
```
**Expected:** Multiple equal-cost next-hops visible; hardware forwarding table shows per-flow hash across three adjacencies.

Traffic load-balance validation:
```bash
# Send 1000-flow traffic via iperf3/hping3 from MX204-1 toward multiple destinations
# Check interface counters
show interfaces et-0/0/0 counters
show interfaces et-0/0/1 counters
show interfaces et-0/0/2 counters
```
**Expected:** Roughly equal distribution across all three egress interfaces (within ±15%).

### IPv6 Fast Reroute / LFA
```
show ipv6 ospf rib lfa
show isis fast-reroute detail
show ipv6 route lfa
```
**Expected:** Pre-computed backup next-hops installed for each prefix; upon link failure `show ipv6 route` reflects backup path within <50ms (verify with timestamped ping continuity test).

### IPv6 Extension Header Processing
```bash
# Construct packet with Hop-by-Hop Options header and transit through OCNOS
python3 -c "
from scapy.all import *
pkt = IPv6(dst='2001:db8:3::1')/IPv6ExtHdrHopByHop(options=[PadN(optdata=b'\\x00'*4)])/ICMPv6EchoRequest()
send(pkt, iface='et-0/0/0')
"
# Check OCNOS counters - should forward, not punt
show ipv6 traffic
show platform hardware qfp active statistics drop
```
**Expected:** HBH-options packets forwarded in hardware; Routing-header Type 0 dropped per RFC 5095; SRH (Type 4) forwarded per RFC 8754; no CPU punting visible.

### IPv6 Flow Label
```
show ipv6 interface et-0/0/0 | include flow
show ipv6 cef detail | include flow-label
```
**Expected:** OCNOS preserves non-zero flow labels on transit (does not zero them); uses flow label as one input to ECMP hash; generated traffic carries non-zero flow labels on originated packets.

### RIPng
```
show ipv6 rip
show ipv6 rip database
show ipv6 route rip
```
**Expected:** RIPng adjacencies formed via link-local addresses; metric values correct; routes installed with AD 120.

---

## Compliance Tracker Categories
- IPv6 Routing & Forwarding — OSPFv3, IS-IS, RIPng
- High Availability & Resiliency — BFD, ECMP, LFA/FRR
- Core IPv6 Protocols & Features — Extension Headers, Flow Label
