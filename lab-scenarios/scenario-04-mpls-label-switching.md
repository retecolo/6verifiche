# Scenario 4 — MPLS Label Switching

## Coverage (7 test cases)
| Category | Test Case |
|---|---|
| MPLS & Label Switching | 6PE (IPv6 Provider Edge) |
| MPLS & Label Switching | 6VPE (IPv6 VPN Provider Edge) |
| MPLS & Label Switching | LDPoIPv6 (LDP over IPv6) |
| MPLS & Label Switching | MPLS BFD over IPv6 |
| MPLS & Label Switching | MPLS-TE RSVP-TE over IPv6 |
| Segment Routing | SR-MPLS with IPv6 Control Plane |
| VPN & Tunneling | MPLS Pseudowires (LDP PW) over IPv6 |

## Topology

```
         ┌──────────────────────────────────────────┐
         │  OCNOS DUT — PE role                      │
         │  lo: 2001:db8:0::1/128                    │
         │  MPLS: enabled, LDP transport IPv6        │
         │  VRF CUSTOMER-A: 2001:db8:a::/48          │
         └──────┬──────────────┬──────────┬──────────┘
           et-0/0/0        et-0/0/1   et-0/0/2
         P2P 100G         P2P 100G  P2P 100G
    2001:db8:12::/127 2001:db8:13::/127 2001:db8:14::/127
                │              │              │
         ┌──────▼──┐     ┌──────▼──┐   ┌──────▼──┐
         │ MX204-1 │     │ MX204-2 │   │ MX204-3 │
         │ PE role │     │ P role  │   │ PE role │
         │ lo::1:1 │     │ lo::2:1 │   │ lo::3:1 │
         │ VRF-A CE│     │ MPLS P  │   │ VRF-A CE│
         └─────────┘     └─────────┘   └─────────┘

Role assignment:
  OCNOS   = PE1 (6PE/6VPE/RSVP-TE headend, LDP peer)
  MX204-1 = PE2 (6PE/6VPE remote PE, LDP peer, PW endpoint)
  MX204-2 = P   (MPLS transit, LDP peer, RSVP-TE transit)
  MX204-3 = PE3 (6VPE remote PE, LDP PW endpoint)

IS-IS Level-2 runs on all links as IGP underlay (IPv6 only).
LDP transport addresses are IPv6 loopbacks.
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
 isis ipv6 enable
 isis metric 10
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127

interface et-0/0/1
 isis ipv6 enable
 isis metric 10
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127

interface et-0/0/2
 isis ipv6 enable
 isis metric 10
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127

interface Loopback0
 ipv6 address 2001:db8:0::1/128
 isis ipv6 enable

! ── MPLS ──────────────────────────────────────────────────────────────────────
mpls ip
mpls label protocol ldp

! ── LDP over IPv6 (RFC 7552) ─────────────────────────────────────────────────
mpls ldp
 address-family ipv6
  discovery transport-address 2001:db8:0::1
  interface et-0/0/0
  interface et-0/0/1
  interface et-0/0/2

! ── BFD for MPLS LSP ─────────────────────────────────────────────────────────
mpls oam
 echo source-ip-address 2001:db8:0::1
 bfd mpls-lsp minimum-interval 150 multiplier 3

! ── RSVP-TE over IPv6 ────────────────────────────────────────────────────────
mpls traffic-eng tunnels
ip rsvp bandwidth
!
interface et-0/0/0
 mpls traffic-eng tunnels
 ip rsvp bandwidth 10000000
interface et-0/0/1
 mpls traffic-eng tunnels
 ip rsvp bandwidth 10000000

interface Tunnel100
 description RSVP-TE-TO-MX204-1
 ip unnumbered Loopback0
 tunnel mode mpls traffic-eng
 tunnel destination 2001:db8:1::1
 tunnel mpls traffic-eng bandwidth 1000000
 tunnel mpls traffic-eng path-option 10 dynamic

! ── SR-MPLS with IPv6 control plane ─────────────────────────────────────────
segment-routing mpls
 set-attributes
  address-family ipv6
   sr-label-preferred
 !
 connected-prefix-sid-map
  address-family ipv6
   2001:db8:0::1/128 index 1 range 1

! ── 6PE ──────────────────────────────────────────────────────────────────────
router bgp 65001
 no bgp default ipv4-unicast
 neighbor 2001:db8:1::1 remote-as 65001
 neighbor 2001:db8:1::1 description iBGP-6PE-MX204-1
 neighbor 2001:db8:1::1 update-source Loopback0
 !
 address-family ipv6 unicast
  neighbor 2001:db8:1::1 activate
  neighbor 2001:db8:1::1 send-community extended
  network 2001:db8:a::/48
 exit-address-family

! ── 6VPE ─────────────────────────────────────────────────────────────────────
vrf definition CUSTOMER-A
 rd 65001:100
 route-target export 65001:100
 route-target import 65001:100
 address-family ipv6
 exit-address-family

interface et-0/0/0.100
 vrf forwarding CUSTOMER-A
 ipv6 address 2001:db8:a:12::1/64

router bgp 65001
 address-family vpnv6
  neighbor 2001:db8:1::1 activate
  neighbor 2001:db8:1::1 send-community extended
 exit-address-family
 !
 address-family ipv6 vrf CUSTOMER-A
  network 2001:db8:a::/48
 exit-address-family

! ── LDP Pseudowire over IPv6 ─────────────────────────────────────────────────
l2vpn xconnect context PW-MX204-3
 member 2001:db8:3::1 100 encapsulation mpls
 !
interface et-0/0/2.200
 encapsulation dot1q 200
 xconnect 2001:db8:3::1 200 encapsulation mpls
```

---

## MX204-1 Configuration (PE2 — 6PE/6VPE remote PE)

```
set system host-name mx204-1
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## IS-IS underlay
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2
set protocols isis level 2 wide-metrics-only

## LDP over IPv6
set protocols ldp interface et-0/0/0.0
set protocols ldp transport-address 2001:db8:1::1

## MPLS
set protocols mpls interface et-0/0/0.0

## RSVP-TE
set protocols rsvp interface et-0/0/0.0

## SR-MPLS
set protocols isis source-packet-routing node-segment ipv6-index 101

## 6PE — iBGP with OCNOS
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:1::1
set protocols bgp group IBGP neighbor 2001:db8:0::1 description TO-OCNOS-PE1
set protocols bgp group IBGP family inet6 unicast
set protocols bgp group IBGP family inet6 labeled-unicast

## 6VPE
set routing-instances CUSTOMER-A instance-type vrf
set routing-instances CUSTOMER-A route-distinguisher 65001:100
set routing-instances CUSTOMER-A vrf-target target:65001:100
set routing-instances CUSTOMER-A interface et-0/0/0.100
set protocols bgp group IBGP family inet6-vpn unicast

## MPLS BFD
set protocols mpls lsp-external-controller lsp-monitor
set protocols bfd adjacency-segment-protection
```

## MX204-2 Configuration (P — MPLS transit)

```
set system host-name mx204-2
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2
set protocols isis level 2 wide-metrics-only

## LDP
set protocols ldp interface et-0/0/0.0
set protocols ldp transport-address 2001:db8:2::1

## MPLS transit
set protocols mpls interface et-0/0/0.0
set protocols rsvp interface et-0/0/0.0
```

## MX204-3 Configuration (PE3 — 6VPE + PW endpoint)

```
set system host-name mx204-3
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## LDP
set protocols ldp interface et-0/0/0.0
set protocols ldp transport-address 2001:db8:3::1

## MPLS
set protocols mpls interface et-0/0/0.0

## 6VPE iBGP
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:3::1
set protocols bgp group IBGP neighbor 2001:db8:0::1
set protocols bgp group IBGP family inet6-vpn unicast

set routing-instances CUSTOMER-A instance-type vrf
set routing-instances CUSTOMER-A route-distinguisher 65001:101
set routing-instances CUSTOMER-A vrf-target target:65001:100

## LDP PW
set protocols l2circuit neighbor 2001:db8:0::1 interface et-0/0/0.200 virtual-circuit-id 200
```

---

## Verification Commands & Expected Outcomes

### LDPoIPv6
```
show mpls ldp neighbor
show mpls ldp bindings
show mpls ldp transport-address
show mpls forwarding-table
```
**Expected:** LDP sessions established using IPv6 transport (source/dest are loopback IPv6 addresses); bindings present for all loopbacks; no IPv4 transport address in `show ldp neighbor`.

### 6PE
```
show bgp ipv6 unicast
show bgp ipv6 unicast 2001:db8:a::/48
show mpls forwarding-table 2001:db8:a::/48 detail
```
**Expected:** IPv6 prefixes in BGP with MPLS label values; outgoing label set in LFIB; traceroute shows MPLS label stack in transit.

### 6VPE
```
show vrf CUSTOMER-A
show bgp vpnv6 unicast vrf CUSTOMER-A
show ipv6 route vrf CUSTOMER-A
show mpls forwarding-table vrf CUSTOMER-A detail
```
**Expected:** VRF isolated routing table; VPNv6 routes exchanged with correct RD/RT; dual label stack (VPN + transport) visible in LFIB; per-VRF forwarding in hardware.

### MPLS BFD over IPv6
```
show bfd neighbors mpls
show mpls oam lsp verify ipv6 2001:db8:1::1 detail
```
**Expected:** BFD session over MPLS LSP `Up`; failure detection < 500ms when LSP is broken; `show mpls oam` shows echo-request/reply with IPv6 transport.

### RSVP-TE over IPv6
```
show mpls traffic-eng tunnels brief
show mpls traffic-eng tunnels tunnel100
show rsvp neighbor
show rsvp session
```
**Expected:** Tunnel100 `up` state; bandwidth reserved; ERO shows explicit path; RSVP sessions use IPv6 addresses; CSPF computed path visible.

### SR-MPLS with IPv6 Control Plane
```
show segment-routing mpls
show segment-routing mpls connected-prefix-sid-map
show isis segment-routing prefix-sid
show mpls forwarding-table label detail
```
**Expected:** Node-SID `1` allocated for `2001:db8:0::1/128`; IS-IS advertises SR prefix-SID sub-TLV; MX204-1 LFIB shows SWAP to OCNOS node-SID label.

### MPLS Pseudowires (LDP PW)
```
show xconnect all
show l2vpn xconnect state up
show mpls l2transport vc detail
show bfd neighbors vc
```
**Expected:** PW `UP` between OCNOS and MX204-3; VC label negotiated via LDP; Ethernet frames forwarded across PW; VCCV BFD session `Up`; LSP ping succeeds.

---

## Compliance Tracker Categories
- MPLS & Label Switching — 6PE, 6VPE, LDPoIPv6, MPLS BFD, RSVP-TE
- Segment Routing — SR-MPLS with IPv6 control plane
- VPN & Tunneling — MPLS Pseudowires
