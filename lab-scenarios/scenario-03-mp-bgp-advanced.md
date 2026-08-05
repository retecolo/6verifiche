# Scenario 3 — MP-BGP & Advanced Routing

## Coverage (7 test cases)
| Category | Test Case |
|---|---|
| IPv6 Routing & Forwarding | MP-BGP |
| IPv6 Routing & Forwarding | BGP ADD-PATH for IPv6 |
| IPv6 Routing & Forwarding | BGP Labeled Unicast (BGP-LU) for IPv6 |
| IPv6 Routing & Forwarding | IPv4 NLRI with IPv6 Next Hop (RFC 8950) |
| High Availability & Resiliency | NSF / Graceful Restart for IPv6 |
| Connectivity & Validation | End-to-End Traffic Validation |
| Connectivity & Validation | Log & Monitor Verification |

## Topology

```
   AS 65001                          AS 65002      AS 65003
   ┌──────────────────────────┐
   │  OCNOS DUT               │
   │  lo: 2001:db8:0::1/128   │
   │  iBGP RR cluster = 1     │
   └───────┬────────┬─────────┘
  eBGP     │et-0/0/0│et-0/0/1    et-0/0/2
 to MX1    │        │             eBGP to MX3
  AS65002  │        │ iBGP        AS 65003
           │        │
    ┌──────▼──┐  ┌──▼──────┐  ┌──────────┐
    │ MX204-1 │  │ MX204-2 │  │ MX204-3  │
    │AS 65002 │  │AS 65001 │  │AS 65003  │
    │lo:2001: │  │lo:2001: │  │lo:2001:  │
    │db8:1::1 │  │db8:2::1 │  │db8:3::1  │
    └─────────┘  └─────────┘  └──────────┘

  eBGP sessions: OCNOS ↔ MX204-1 (AS 65002), OCNOS ↔ MX204-3 (AS 65003)
  iBGP session:  OCNOS ↔ MX204-2 (same AS 65001, Route-Reflector client)
  ADD-PATH:      enabled between OCNOS and MX204-2 for ipv6 unicast
  BGP-LU:        OCNOS ↔ MX204-1 for labeled IPv6 unicast
  RFC 8950:      OCNOS ↔ MX204-3 — IPv4 NLRI with IPv6 next-hop
  NSF/GR:        enabled on all BGP sessions
```

---

## OCNOS Configuration

```
! ── Interfaces ────────────────────────────────────────────────────────────────
interface et-0/0/0
 description TO-MX204-1-eBGP-AS65002
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127

interface et-0/0/1
 description TO-MX204-2-iBGP-AS65001
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127

interface et-0/0/2
 description TO-MX204-3-eBGP-AS65003-RFC8950
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127

interface Loopback0
 ipv6 address 2001:db8:0::1/128

! ── BGP ───────────────────────────────────────────────────────────────────────
router bgp 65001
 bgp router-id 0.0.0.1
 bgp log-neighbor-changes
 no bgp default ipv4-unicast

 ! Non-Stop Forwarding / Graceful Restart
 bgp graceful-restart
 bgp graceful-restart stalepath-time 300
 bgp graceful-restart restart-time 120

 ! ── iBGP to MX204-2 (Route Reflector client) ────────────────────────────────
 neighbor 2001:db8:13::1 remote-as 65001
 neighbor 2001:db8:13::1 description iBGP-MX204-2
 neighbor 2001:db8:13::1 update-source Loopback0
 neighbor 2001:db8:13::1 route-reflector-client

 ! ── eBGP to MX204-1 ──────────────────────────────────────────────────────────
 neighbor 2001:db8:12::1 remote-as 65002
 neighbor 2001:db8:12::1 description eBGP-MX204-1

 ! ── eBGP to MX204-3 ──────────────────────────────────────────────────────────
 neighbor 2001:db8:14::1 remote-as 65003
 neighbor 2001:db8:14::1 description eBGP-MX204-3-RFC8950

 ! ── IPv6 unicast AF ──────────────────────────────────────────────────────────
 address-family ipv6 unicast
  network 2001:db8:0::1/128
  neighbor 2001:db8:12::1 activate
  neighbor 2001:db8:12::1 send-community both
  neighbor 2001:db8:13::1 activate
  neighbor 2001:db8:13::1 send-community both
  neighbor 2001:db8:13::1 additional-paths send receive  ! ADD-PATH
  neighbor 2001:db8:14::1 activate
  neighbor 2001:db8:14::1 send-community both
  maximum-paths 3
  additional-paths select all
 exit-address-family

 ! ── IPv6 labeled unicast (BGP-LU) ────────────────────────────────────────────
 address-family ipv6 labeled-unicast
  neighbor 2001:db8:12::1 activate
  network 2001:db8:0::1/128
 exit-address-family

 ! ── IPv4 unicast with IPv6 next-hop (RFC 8950 / 5549) ────────────────────────
 address-family ipv4 unicast
  neighbor 2001:db8:14::1 activate
  neighbor 2001:db8:14::1 capability extended-nexthop   ! RFC 8950
  network 192.0.2.1/32
 exit-address-family
```

---

## MX204-1 Configuration (AS 65002 — eBGP + BGP-LU peer)

```
set system host-name mx204-1
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## eBGP to OCNOS
set protocols bgp group EBGP-OCNOS type external
set protocols bgp group EBGP-OCNOS peer-as 65001
set protocols bgp group EBGP-OCNOS local-as 65002
set protocols bgp group EBGP-OCNOS neighbor 2001:db8:12::0 description TO-OCNOS

## IPv6 unicast AF
set protocols bgp group EBGP-OCNOS family inet6 unicast
set protocols bgp group EBGP-OCNOS neighbor 2001:db8:12::0 family inet6 unicast

## BGP Labeled Unicast
set protocols bgp group EBGP-OCNOS family inet6 labeled-unicast
set protocols bgp group EBGP-OCNOS neighbor 2001:db8:12::0 family inet6 labeled-unicast

## Graceful Restart
set protocols bgp group EBGP-OCNOS graceful-restart

## Advertise loopback
set policy-options policy-statement EXPORT-LOOPBACK term LO from route-filter 2001:db8:1::1/128 exact
set policy-options policy-statement EXPORT-LOOPBACK term LO then accept
set protocols bgp group EBGP-OCNOS export EXPORT-LOOPBACK
```

## MX204-2 Configuration (AS 65001 — iBGP + ADD-PATH)

```
set system host-name mx204-2
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

## iBGP to OCNOS (RR client)
set protocols bgp group IBGP-OCNOS type internal
set protocols bgp group IBGP-OCNOS local-address 2001:db8:13::1
set protocols bgp group IBGP-OCNOS neighbor 2001:db8:13::0

## IPv6 unicast + ADD-PATH
set protocols bgp group IBGP-OCNOS family inet6 unicast add-path receive
set protocols bgp group IBGP-OCNOS family inet6 unicast add-path send path-count 3

## Graceful Restart
set protocols bgp group IBGP-OCNOS graceful-restart

set policy-options policy-statement EXPORT-LO term 1 from route-filter 2001:db8:2::1/128 exact
set policy-options policy-statement EXPORT-LO term 1 then accept
set protocols bgp group IBGP-OCNOS export EXPORT-LO
```

## MX204-3 Configuration (AS 65003 — eBGP + RFC 8950)

```
set system host-name mx204-3
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

## eBGP to OCNOS
set protocols bgp group EBGP-OCNOS type external
set protocols bgp group EBGP-OCNOS peer-as 65001
set protocols bgp group EBGP-OCNOS local-as 65003
set protocols bgp group EBGP-OCNOS neighbor 2001:db8:14::0

## RFC 8950: IPv4 NLRI with IPv6 next-hop
set protocols bgp group EBGP-OCNOS family inet unicast extended-nexthop
set protocols bgp group EBGP-OCNOS neighbor 2001:db8:14::0 family inet unicast extended-nexthop

## IPv6 unicast
set protocols bgp group EBGP-OCNOS family inet6 unicast
set protocols bgp group EBGP-OCNOS neighbor 2001:db8:14::0 family inet6 unicast

## Graceful Restart
set protocols bgp group EBGP-OCNOS graceful-restart

## Advertise an IPv4 prefix for RFC 8950 testing
set interfaces lo0 unit 0 family inet address 198.51.100.1/32
set policy-options policy-statement EXPORT-V4 term 1 from route-filter 198.51.100.1/32 exact
set policy-options policy-statement EXPORT-V4 term 1 then accept
set protocols bgp group EBGP-OCNOS export EXPORT-V4
```

---

## Verification Commands & Expected Outcomes

### MP-BGP (eBGP + iBGP)
```
show bgp summary
show bgp neighbors 2001:db8:12::1
show bgp ipv6 unicast
show bgp ipv6 unicast 2001:db8:1::1/128
show ipv6 route bgp
```
**Expected:** All three peers `Established`; eBGP peers in Established; iBGP reflector-client relationship shown; IPv6 prefixes from all three MX loopbacks in RIB with correct next-hops.

### BGP ADD-PATH
```
show bgp ipv6 unicast neighbors 2001:db8:13::1 received-routes
show bgp ipv6 unicast neighbors 2001:db8:13::1 advertised-routes
show bgp ipv6 unicast 2001:db8:1::1/128 paths
```
**Expected:** `Additional-path` capability negotiated; multiple path-IDs visible per prefix; MX204-2 receives more than one path for prefixes learned from both eBGP peers.

### BGP-LU (Labeled Unicast)
```
show bgp ipv6 labeled-unicast
show bgp ipv6 labeled-unicast 2001:db8:1::1/128
show mpls label-binding
show mpls forwarding-table detail
```
**Expected:** `Label` field non-zero in BGP table; LFIB entry present; MPLS-encapsulated IPv6 traffic forwarded across et-0/0/0.

### RFC 8950 — IPv4 NLRI with IPv6 Next Hop
```
show bgp ipv4 unicast 198.51.100.1/32
show bgp ipv4 unicast neighbors 2001:db8:14::1 received-routes
show ipv4 route 198.51.100.1/32
```
**Expected:** IPv4 prefix `198.51.100.1/32` present in BGP table with IPv6 next-hop `2001:db8:14::1`; `extended-nexthop` capability shown in neighbor details; IPv4 traffic forwarded over IPv6-only underlay.

### NSF / Graceful Restart
```
show bgp neighbors 2001:db8:12::1 | include graceful
show bgp neighbors 2001:db8:12::1 | include Restart
show bgp graceful-restart
```
**Expected:** GR capability advertised and received on all sessions; restart time 120s, stale path time 300s.

NSF test procedure:
```bash
# Trigger BGP process restart on OCNOS
clear bgp ipv6 * soft
# Or restart process: service bgpd restart
# On MX204-1 observe
show bgp neighbor 2001:db8:12::0 | match "Restart|stale"
```
**Expected:** MX204-1 marks paths as stale but continues forwarding; OCNOS re-establishes sessions; stale paths replaced within restart window; no traffic black-hole.

### End-to-End Traffic Validation
```bash
# From MX204-1 to MX204-3 loopback
ping6 2001:db8:3::1 source 2001:db8:1::1 count 1000
traceroute6 2001:db8:3::1 source 2001:db8:1::1

# IPv4 via RFC 8950
ping 198.51.100.1 source 192.0.2.1 count 100
```
**Expected:** 1000/1000 ping replies (no drops); traceroute shows OCNOS as transit hop; IPv4 pings succeed through IPv6-only underlay.

### Log & Monitor Verification
```
show bgp event-history all
show logging | include BGP
```
**Expected:** BGP state transitions logged with timestamps and peer IPv6 addresses; no events missing.

---

## Compliance Tracker Categories
- IPv6 Routing & Forwarding — MP-BGP, ADD-PATH, BGP-LU, RFC 8950
- High Availability & Resiliency — NSF/GR
- Connectivity & Validation — End-to-end traffic, Logging
