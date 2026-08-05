# Scenario 5 — SRv6

## Coverage (8 test cases)
| Category | Test Case |
|---|---|
| Segment Routing | SRv6 Encapsulation (H.Encaps / H.Insert) |
| Segment Routing | SRv6 Endpoint Behaviors (End, End.X, End.DX6, End.DT6) |
| Segment Routing | SRv6 L3VPN (BGP-SRv6 VPN) |
| Segment Routing | SRv6 Traffic Engineering (SRv6-TE Policy) |
| Segment Routing | SRv6 IS-IS Extensions |
| Segment Routing | SRv6 OSPFv3 Extensions |
| Segment Routing | SRv6 Micro-SID (uSID) |
| Segment Routing | SRv6 OAM (Ping / Traceroute) |

## Topology

```
  SRv6 Locator blocks:
    OCNOS:   fcbb:0:1::/48   (uSID block: fcbb:0:1::/48, uSID len=16)
    MX204-1: fcbb:0:2::/48
    MX204-2: fcbb:0:3::/48
    MX204-3: fcbb:0:4::/48

  SIDs (OCNOS):
    End:       fcbb:0:1:0001::    (Node SID)
    End.X(0/0):fcbb:0:1:0002::   (Adj toward MX204-1)
    End.X(0/1):fcbb:0:1:0003::   (Adj toward MX204-2)
    End.DT6:   fcbb:0:1:0004::   (VRF CUST-A table lookup)
    End.DX6:   fcbb:0:1:0005::   (Direct IPv6 cross-connect)
    uSID:      fcbb:0:1:0001:0002:0003:: (compressed: 3-SID chain)

  ┌──────────────────────────────────────────┐
  │  OCNOS DUT — SRv6 headend & endpoint     │
  │  lo: 2001:db8:0::1/128                   │
  │  SRv6 locator: fcbb:0:1::/48             │
  └──────┬──────────────┬──────────┬──────────┘
    et-0/0/0        et-0/0/1   et-0/0/2
  2001:db8:12::/127 2001:db8:13::/127 2001:db8:14::/127
         │              │              │
  ┌──────▼──┐     ┌──────▼──┐   ┌──────▼──┐
  │ MX204-1 │     │ MX204-2 │   │ MX204-3 │
  │locator: │     │locator: │   │locator: │
  │fcbb:0:2 │     │fcbb:0:3 │   │fcbb:0:4 │
  └─────────┘     └─────────┘   └─────────┘

  IS-IS Level-2 as IPv6-only underlay.
  BGP-SRv6 VPN sessions: OCNOS ↔ MX204-1, OCNOS ↔ MX204-3
  SRv6-TE policy: OCNOS → MX204-2 → MX204-1 (steers around direct link)
```

---

## OCNOS Configuration

```
! ── IS-IS underlay ────────────────────────────────────────────────────────────
router isis
 net 49.0001.0000.0000.0001.00
 is-type level-2-only
 metric-style wide
 address-family ipv6 unicast

interface et-0/0/0
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127
 isis ipv6 enable

interface et-0/0/1
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127
 isis ipv6 enable

interface et-0/0/2
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127
 isis ipv6 enable

interface Loopback0
 ipv6 address 2001:db8:0::1/128
 isis ipv6 enable

! ── SRv6 Locator & SIDs ──────────────────────────────────────────────────────
segment-routing srv6
 locators
  locator MAIN
   prefix fcbb:0:1::/48
   behavior usid          ! Enable Micro-SID
  !
 !
 sid-behaviors
  local fcbb:0:1:0001:: behavior End
  local fcbb:0:1:0002:: behavior End.X interface et-0/0/0
  local fcbb:0:1:0003:: behavior End.X interface et-0/0/1
  local fcbb:0:1:0004:: behavior End.DT6 vrf CUST-A
  local fcbb:0:1:0005:: behavior End.DX6 interface et-0/0/0 nexthop 2001:db8:12::1

! ── IS-IS SRv6 extensions (RFC 9352) ─────────────────────────────────────────
router isis
 address-family ipv6 unicast
  segment-routing srv6 locator MAIN

! ── OSPFv3 SRv6 extensions (RFC 9513) ───────────────────────────────────────
ipv6 router ospf 1
 router-id 0.0.0.1
 segment-routing srv6
  locator MAIN

! ── H.Encaps headend behavior ────────────────────────────────────────────────
segment-routing srv6
 encapsulation
  source-address 2001:db8:0::1
  hop-limit 255

! ── SRv6 L3VPN (BGP-SRv6 VPN) ───────────────────────────────────────────────
vrf definition CUST-A
 rd 65001:200
 route-target export 65001:200
 route-target import 65001:200
 address-family ipv6
 exit-address-family

router bgp 65001
 bgp router-id 0.0.0.1
 no bgp default ipv4-unicast

 neighbor 2001:db8:1::1 remote-as 65001
 neighbor 2001:db8:1::1 update-source Loopback0
 neighbor 2001:db8:3::1 remote-as 65001
 neighbor 2001:db8:3::1 update-source Loopback0

 address-family vpnv6
  neighbor 2001:db8:1::1 activate
  neighbor 2001:db8:1::1 send-community extended
  neighbor 2001:db8:3::1 activate
  neighbor 2001:db8:3::1 send-community extended
 exit-address-family

 address-family ipv6 vrf CUST-A
  network 2001:db8:cafe::/48
  redistribute connected
  segment-routing srv6
   sid-alloc per-vrf
   end-dt6 locator MAIN
 exit-address-family

! ── SRv6-TE Policy ───────────────────────────────────────────────────────────
! Steer traffic to MX204-1 via MX204-2 (avoid direct link)
segment-routing traffic-eng
 policy TO-MX1-VIA-MX2
  color 100 end-point fcbb:0:2:0001::
  candidate-path
   preference 100 explicit segment-list SL-VIA-MX2
  !
 !
 segment-list SL-VIA-MX2
  index 1 srv6 sid fcbb:0:3:0001::   ! transit via MX204-2
  index 2 srv6 sid fcbb:0:2:0001::   ! endpoint MX204-1
```

---

## MX204-1 Configuration (SRv6 locator fcbb:0:2::/48)

```
set system host-name mx204-1
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2
set protocols isis level 2 wide-metrics-only

## SRv6
set protocols isis source-packet-routing srv6 locator MAIN end-sid fcbb:0:2:0001:: flavor psp-usd
set protocols isis source-packet-routing srv6 locator MAIN locator-prefix fcbb:0:2::/48

set routing-options source-packet-routing srv6 locator MAIN fcbb:0:2::/48
set routing-options source-packet-routing srv6 no-reduced-srh

## uSID
set routing-options source-packet-routing srv6 micro-sid

## BGP-SRv6 VPN
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:1::1
set protocols bgp group IBGP neighbor 2001:db8:0::1

set protocols bgp group IBGP family inet6-vpn unicast
set routing-instances CUST-A instance-type vrf
set routing-instances CUST-A route-distinguisher 65001:201
set routing-instances CUST-A vrf-target target:65001:200
set routing-instances CUST-A routing-options rib CUST-A.inet6.0 static route 2001:db8:cafe:1::/64 reject
```

## MX204-2 Configuration (SRv6 transit node, locator fcbb:0:3::/48)

```
set system host-name mx204-2
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## SRv6 transit
set protocols isis source-packet-routing srv6 locator MAIN end-sid fcbb:0:3:0001:: flavor psp-usd
set routing-options source-packet-routing srv6 locator MAIN fcbb:0:3::/48
set routing-options source-packet-routing srv6 micro-sid

## OSPFv3 SRv6 (for testing OSPFv3 extensions in parallel)
set protocols ospf3 area 0.0.0.0 interface et-0/0/0.0
set protocols ospf3 source-packet-routing srv6 locator MAIN
```

## MX204-3 Configuration (SRv6 PE, locator fcbb:0:4::/48)

```
set system host-name mx204-3
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## SRv6
set protocols isis source-packet-routing srv6 locator MAIN end-sid fcbb:0:4:0001:: flavor psp-usd
set routing-options source-packet-routing srv6 locator MAIN fcbb:0:4::/48
set routing-options source-packet-routing srv6 micro-sid

## BGP-SRv6 VPN
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:3::1
set protocols bgp group IBGP neighbor 2001:db8:0::1
set protocols bgp group IBGP family inet6-vpn unicast

set routing-instances CUST-A instance-type vrf
set routing-instances CUST-A route-distinguisher 65001:202
set routing-instances CUST-A vrf-target target:65001:200
```

---

## Verification Commands & Expected Outcomes

### SRv6 Encapsulation (H.Encaps / H.Insert)
```
show segment-routing srv6 sid
show segment-routing srv6 encapsulation
show ipv6 traffic | include SRH
```
**Expected:** Local SIDs allocated and active; H.Encaps adds outer IPv6 header + SRH; H.Insert inserts SRH into existing IPv6 packet. Verify via Wireshark or `debug ipv6 packet detail` that SRH is present with correct SID list.

### SRv6 Endpoint Behaviors
```
show segment-routing srv6 sid detail
show segment-routing srv6 forwarding
show ipv6 cef fcbb:0:1:0001:: detail
```
**Expected:**
- `End` — SID lookup, decrement SL, forward
- `End.X` — SID lookup, forward to specific adjacency (et-0/0/0 or et-0/0/1)
- `End.DX6` — decapsulate, forward to nexthop
- `End.DT6` — decapsulate, VRF table lookup in CUST-A

All behaviors processed in hardware without CPU punting (verify via `show platform resources hardware dataplane`).

### SRv6 L3VPN
```
show bgp vpnv6 unicast
show bgp vpnv6 unicast vrf CUST-A
show ipv6 route vrf CUST-A
show segment-routing srv6 sid | include DT6
```
**Expected:** VPNv6 routes exchanged with SRv6 End.DT6 SIDs as next-hop encoded in BGP; per-VRF forwarding via SRv6 data plane; pings between CUST-A prefixes on MX204-1 and MX204-3 succeed through OCNOS.

### SRv6-TE Policy
```
show segment-routing traffic-eng policy
show segment-routing traffic-eng policy name TO-MX1-VIA-MX2 detail
show segment-routing traffic-eng forwarding policy
```
**Expected:** Policy `TO-MX1-VIA-MX2` active; explicit SID list `fcbb:0:3:0001::, fcbb:0:2:0001::` imposed at headend; traceroute shows path OCNOS → MX204-2 → MX204-1 (bypassing direct et-0/0/0 link).

### SRv6 IS-IS Extensions (RFC 9352)
```
show isis database verbose | include SRv6
show isis segment-routing srv6 locators
show isis srv6 locator
```
**Expected:** SRv6 Locator TLV (TLV 27) and SID sub-TLVs present in IS-IS LSP database for all four nodes; each node can resolve all others' SIDs; `fcbb:0:*/48` locators visible in routing table from IS-IS.

### SRv6 OSPFv3 Extensions (RFC 9513)
```
show ipv6 ospf database opaque-area
show ipv6 ospf srv6 locator
show segment-routing srv6 ospfv3
```
**Expected:** SRv6 Locator LSA (type 0x8 Extended Prefix) advertised by MX204-2; OCNOS installs MX204-2's SRv6 locator via OSPFv3.

### SRv6 Micro-SID (uSID)
```
show segment-routing srv6 sid | include usid
show ipv6 cef fcbb:0:1:: detail
```
**Expected:** uSID container processed in hardware; active uSID pointer advances without CPU involvement; uSID block `fcbb:0:1:0001:0002::` correctly steers through two-hop path in one SRH.

### SRv6 OAM (Ping / Traceroute)
```
ping srv6 fcbb:0:2:0001:: source 2001:db8:0::1
ping srv6 fcbb:0:3:0001:: source 2001:db8:0::1 sid-list fcbb:0:3:0001::
traceroute srv6 fcbb:0:2:0001:: source 2001:db8:0::1
```
**Expected:** SRv6 echo request/reply with SRH; each SID hop reports latency; fault isolation pinpoints broken SID.

---

## Compliance Tracker Categories
- Segment Routing — All 8 SRv6 test cases
