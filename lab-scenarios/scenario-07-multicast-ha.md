# Scenario 7 — Multicast & High Availability

## Coverage (9 test cases)
| Category | Test Case |
|---|---|
| IPv6 Multicast | MLDv2 (Multicast Listener Discovery v2) |
| IPv6 Multicast | PIM-SM for IPv6 |
| IPv6 Multicast | PIM-SSM for IPv6 |
| IPv6 Multicast | IPv6 Multicast VPN (mVPN / NG-mVPN) |
| IPv6 Multicast | mLDP (Multipoint LDP) over IPv6 |
| High Availability & Resiliency | VRRPv3 for IPv6 |
| High Availability & Resiliency | NSF / Graceful Restart for IPv6 |
| High Availability & Resiliency | ECMP & Load Balancing for IPv6 |
| High Availability & Resiliency | IPv6 Fast Reroute (IP-FRR / LFA) |

## Topology

```
  PIM-SM RP:  OCNOS (Loopback0 = 2001:db8:0::1) — Anycast RP
  PIM-SSM:    ff35::/32 range (source-specific, no RP)
  mVPN:       VRF MCAST-VPN with P-tunnel (mLDP P2MP)

                ┌─────────────────────────────────────────┐
                │  OCNOS DUT                               │
                │  lo: 2001:db8:0::1/128                   │
                │  RP for ff05::/16, VRRPv3 master         │
                │  VRF MCAST-VPN                           │
                └───────┬──────────────┬──────────┬────────┘
                  et-0/0/0         et-0/0/1    et-0/0/2
              2001:db8:12::/127 2001:db8:13::/127 2001:db8:14::/127
                        │              │              │
                  ┌─────▼──┐    ┌──────▼──┐   ┌──────▼──┐
                  │MX204-1 │    │MX204-2  │   │MX204-3  │
                  │PIM nbr │    │PIM nbr  │   │PIM nbr  │
                  │VRRPv3  │    │mVPN PE  │   │mVPN PE  │
                  │backup  │    │source   │   │receiver │
                  └────────┘    └─────────┘   └─────────┘

  VRRPv3:
    Virtual address: 2001:db8:12::ff/128  (link-local: fe80::1)
    OCNOS = Master (priority 200)
    MX204-1 = Backup (priority 100)
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

! ── MLDv2 ─────────────────────────────────────────────────────────────────────
interface et-0/0/0
 ipv6 mld version 2
 ipv6 mld query-interval 60
 ipv6 mld last-member-query-interval 1

interface et-0/0/1
 ipv6 mld version 2
interface et-0/0/2
 ipv6 mld version 2

! ── PIM-SM for IPv6 ──────────────────────────────────────────────────────────
ipv6 multicast-routing

interface et-0/0/0
 ipv6 pim sparse-mode

interface et-0/0/1
 ipv6 pim sparse-mode

interface et-0/0/2
 ipv6 pim sparse-mode

interface Loopback0
 ipv6 pim sparse-mode

! Static RP for ff05::/16 (OCNOS as RP)
ipv6 pim rp-address 2001:db8:0::1 ff05::/16

! BSR candidate RP (for dynamic RP tests)
ipv6 pim bsr-candidate Loopback0 130
ipv6 pim rp-candidate Loopback0 group-list ff00::/8 priority 0

! ── PIM-SSM for IPv6 ─────────────────────────────────────────────────────────
! SSM range ff35::/32 (default SSM range per RFC 4607 for IPv6 = ff3x::/32)
ipv6 pim ssm range SSM-RANGE
!
ipv6 access-list SSM-RANGE
 permit ipv6 any ff35::/32

! ── VRRPv3 for IPv6 ──────────────────────────────────────────────────────────
! OCNOS = Master, MX204-1 = Backup
interface et-0/0/0
 vrrp 10 ipv6 2001:db8:12::ff
 vrrp 10 ipv6 fe80::1 link-local
 vrrp 10 priority 200
 vrrp 10 preempt
 vrrp 10 timers advertise 100

! ── mVPN (NG-mVPN) over mLDP P2MP ───────────────────────────────────────────
vrf definition MCAST-VPN
 rd 65001:400
 route-target export 65001:400
 route-target import 65001:400
 address-family ipv6
 exit-address-family

! mLDP P2MP P-tunnel for mVPN
mpls mldp

multicast-routing vrf MCAST-VPN
 address-family ipv6
  mdt default mpls mldp P2MP 2001:db8:0::1   ! root = OCNOS loopback
 exit-address-family

! ── mLDP (Multipoint LDP) over IPv6 ─────────────────────────────────────────
mpls ldp
 address-family ipv6
  mldp
  discovery transport-address 2001:db8:0::1
  interface et-0/0/0
  interface et-0/0/1
  interface et-0/0/2
```

---

## MX204-1 Configuration (PIM neighbor, VRRPv3 backup)

```
set system host-name mx204-1
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## PIM-SM
set protocols pim interface et-0/0/0.0 mode sparse
set protocols pim rp static address 2001:db8:0::1

## MLDv2
set protocols mld interface et-0/0/0.0 version 2

## VRRPv3 (backup)
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set protocols vrrp interface et-0/0/0.0 group 10 virtual-address 2001:db8:12::ff
set protocols vrrp interface et-0/0/0.0 group 10 priority 100

## mLDP
set protocols ldp p2mp
set protocols ldp interface et-0/0/0.0
set protocols ldp transport-address 2001:db8:1::1
```

## MX204-2 Configuration (mVPN source PE)

```
set system host-name mx204-2
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## PIM-SM
set protocols pim interface et-0/0/0.0 mode sparse
set protocols pim rp static address 2001:db8:0::1

## mVPN source
set routing-instances MCAST-VPN instance-type vrf
set routing-instances MCAST-VPN route-distinguisher 65001:401
set routing-instances MCAST-VPN vrf-target target:65001:400
set routing-instances MCAST-VPN protocols pim interface all mode sparse
set routing-instances MCAST-VPN multicast-vpn source-pe 2001:db8:2::1

## mLDP
set protocols ldp p2mp
set protocols ldp interface et-0/0/0.0
set protocols ldp transport-address 2001:db8:2::1
```

## MX204-3 Configuration (mVPN receiver PE)

```
set system host-name mx204-3
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## PIM-SM
set protocols pim interface et-0/0/0.0 mode sparse
set protocols pim rp static address 2001:db8:0::1

## mVPN receiver
set routing-instances MCAST-VPN instance-type vrf
set routing-instances MCAST-VPN route-distinguisher 65001:402
set routing-instances MCAST-VPN vrf-target target:65001:400
set routing-instances MCAST-VPN protocols pim interface all mode sparse

## mLDP
set protocols ldp p2mp
set protocols ldp interface et-0/0/0.0
set protocols ldp transport-address 2001:db8:3::1
```

---

## Verification Commands & Expected Outcomes

### MLDv2
```
show ipv6 mld groups
show ipv6 mld interface
show ipv6 mld snooping
```
**Expected:** MLDv2 General Query sent every 60s from OCNOS; `show ipv6 mld groups` shows joined groups; INCLUDE/EXCLUDE filter modes tracked; snooping tables populated in hardware without CPU flooding.

### PIM-SM for IPv6
```
show ipv6 pim neighbor
show ipv6 pim rp mapping
show ipv6 mroute
show ipv6 pim interface
```
**Expected:** PIM adjacencies on all three interfaces; RP `2001:db8:0::1` in mapping; `(*,G)` and `(S,G)` entries in mroute table; RPT-to-SPT switchover visible in `debug ipv6 pim`.

Multicast traffic test:
```bash
# On MX204-2 — send to group ff05::1
iperf3 -s -u -6 --bind-dev et-0/0/0 &
iperf3 -c ff05::1 -u -6 --ttl 10
# On MX204-3 — observe receipt
```
**Expected:** Multicast stream received at MX204-3; OCNOS mroute shows hardware-forwarded (S,G) entry; no CPU punting.

### PIM-SSM for IPv6
```
show ipv6 mroute ff35::
show ipv6 pim interface | include SSM
```
**Expected:** `(S,G)` entries only (no `*,G`) for ff35:: groups; no RP involved; join/prune signaled via MLDv2 INCLUDE reports; forwarding correct.

### IPv6 Multicast VPN (mVPN / NG-mVPN)
```
show multicast-vpn vrf MCAST-VPN
show mpls mldp p2mp
show ip mroute vrf MCAST-VPN
```
**Expected:** P2MP mLDP tree rooted at OCNOS reaches both MX204-2 and MX204-3; multicast traffic isolated to VRF MCAST-VPN; no cross-VRF leakage in `show ip mroute`.

### mLDP over IPv6
```
show mpls mldp database
show mpls mldp neighbors
show mpls mldp p2mp
show mpls forwarding mldp
```
**Expected:** mLDP neighbors using IPv6 transport; P2MP tree label entries in LFIB; root is `2001:db8:0::1`; leaf nodes are MX204-1, MX204-2, MX204-3 loopbacks.

### VRRPv3 for IPv6
```
show vrrp ipv6
show vrrp detail
show ipv6 neighbors | include 2001:db8:12::ff
```
**Expected:** OCNOS as Master (priority 200); virtual address `2001:db8:12::ff` owned by OCNOS; RA sends VIP in prefix; MX204-1 in Backup state.

Failover test:
```bash
# Bring down OCNOS VRRPv3 master
interface et-0/0/0
 vrrp 10 priority 50     ! lower below backup
# Observe MX204-1 take over
```
**Expected:** MX204-1 transitions to Master within 3× advertisement interval (300ms); virtual address accessible from MX204-1; OCNOS recovers to Master upon preempt.

### NSF / Graceful Restart (cross-reference from Scenario 3)
```
show bgp neighbors | include Graceful
show isis graceful-restart
show ospfv3 graceful-restart
```
**Expected:** GR helper mode active for all sessions; restart window honored; FIB preserved during restart.

### ECMP & Load Balancing
```
show ipv6 route ecmp
show forwarding ipv6 table
show platform hardware qfp active statistics
```
**Expected:** Three equal-cost paths; flow-label and L4-port hash distributes traffic; all three egress interfaces carry load.

### IPv6 LFA / Fast Reroute
```
show ipv6 ospf rib lfa
show isis fast-reroute
```
**Expected:** Pre-computed backup paths installed; convergence < 50ms on link failure (validate with continuous ping + timestamp).

---

## Compliance Tracker Categories
- IPv6 Multicast — MLDv2, PIM-SM, PIM-SSM, mVPN, mLDP
- High Availability & Resiliency — VRRPv3, NSF/GR, ECMP, LFA
