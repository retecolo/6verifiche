# Scenario 6 — Overlays & EVPN

## Coverage (5 test cases)
| Category | Test Case |
|---|---|
| Overlay Networks & EVPN | VXLAN over IPv6 (VXLANv6 Unicast) |
| Overlay Networks & EVPN | VXLAN EVPN over IPv6 |
| Overlay Networks & EVPN | EVPN L3 Gateway (IRB) over IPv6 |
| Overlay Networks & EVPN | EVPN Multi-Homing (ES-LAG) over IPv6 |
| Overlay Networks & EVPN | GENEVE over IPv6 |

## Topology

```
                ┌───────────────────────────────────────────────────┐
                │  OCNOS DUT — VTEP, BGP RR, IRB GW                 │
                │  lo: 2001:db8:0::1/128   VTEP: 2001:db8:0::1      │
                │  IRB anycast GW: 2001:db8:overlay:1::1/64         │
                │  ES-LAG: to MX204-1 + MX204-2 (dual-homed CE)     │
                └────────┬──────────────┬──────────────┬────────────┘
                   et-0/0/0         et-0/0/1       et-0/0/2
               2001:db8:12::/127 2001:db8:13::/127 2001:db8:14::/127
                      │               │                │
                ┌─────▼──┐      ┌──────▼──┐     ┌──────▼──┐
                │MX204-1 │      │MX204-2  │     │MX204-3  │
                │VTEP    │      │VTEP     │     │VTEP     │
                │ESI peer│      │ESI peer │     │remote PE│
                │for CE  │      │for CE   │     │         │
                └────────┘      └─────────┘     └─────────┘

  IS-IS IPv6 underlay on all links.
  BGP EVPN: all peers iBGP with OCNOS as RR.
  VNI 10010: L2 stretch across all four VTEPs.
  VNI 10001: L3 VRF OVERLAY mapped for IRB.
  ES-LAG: MX204-1 and MX204-2 share ESI 00:11:22:33:44:55:66:77:88:99 for CE.
  GENEVE: tested on et-0/0/2 toward MX204-3.
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

! ── NVE / VTEP (VXLANv6) ─────────────────────────────────────────────────────
interface nve1
 no shutdown
 source-interface Loopback0
 host-reachability protocol bgp
 !
 member vni 10010
  ingress-replication protocol bgp
 !
 member vni 10001 associate-vrf

! ── VRF for IRB ───────────────────────────────────────────────────────────────
vrf definition OVERLAY
 rd 65001:300
 route-target export 65001:300
 route-target import 65001:300
 address-family ipv6
 exit-address-family

! ── IRB / SVI ─────────────────────────────────────────────────────────────────
interface Vlan10
 vrf forwarding OVERLAY
 ipv6 address 2001:db8:overlay:1::1/64
 ip anycast-address       ! distributed anycast gateway

! ── VLAN-to-VNI mapping ───────────────────────────────────────────────────────
vlan 10
 vn-segment 10010

! ── BGP EVPN ─────────────────────────────────────────────────────────────────
router bgp 65001
 bgp router-id 0.0.0.1
 no bgp default ipv4-unicast

 neighbor 2001:db8:1::1 remote-as 65001
 neighbor 2001:db8:1::1 update-source Loopback0
 neighbor 2001:db8:1::1 description iBGP-MX204-1-EVPN-RRC
 neighbor 2001:db8:2::1 remote-as 65001
 neighbor 2001:db8:2::1 update-source Loopback0
 neighbor 2001:db8:2::1 description iBGP-MX204-2-EVPN-RRC
 neighbor 2001:db8:3::1 remote-as 65001
 neighbor 2001:db8:3::1 update-source Loopback0
 neighbor 2001:db8:3::1 description iBGP-MX204-3-EVPN-RRC

 address-family l2vpn evpn
  neighbor 2001:db8:1::1 activate
  neighbor 2001:db8:1::1 send-community extended
  neighbor 2001:db8:1::1 route-reflector-client
  neighbor 2001:db8:2::1 activate
  neighbor 2001:db8:2::1 send-community extended
  neighbor 2001:db8:2::1 route-reflector-client
  neighbor 2001:db8:3::1 activate
  neighbor 2001:db8:3::1 send-community extended
  neighbor 2001:db8:3::1 route-reflector-client
 exit-address-family

! ── EVPN Multi-Homing (ES-LAG) ──────────────────────────────────────────────
! OCNOS side of ES-LAG toward MX204-1 and MX204-2
evpn
 ethernet-segment 1
  identifier 0000.1122.3344.5566.7788
  redundancy-mode all-active

interface et-0/0/0
 evpn ethernet-segment 1
interface et-0/0/1
 evpn ethernet-segment 1

! ── GENEVE tunnel toward MX204-3 ─────────────────────────────────────────────
interface geneve1
 tunnel source 2001:db8:0::1
 tunnel destination 2001:db8:3::1
 tunnel vni 20010
 no shutdown
```

---

## MX204-1 Configuration (VTEP, ES-LAG peer)

```
set system host-name mx204-1
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## IS-IS underlay
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## BGP EVPN
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:1::1
set protocols bgp group IBGP neighbor 2001:db8:0::1
set protocols bgp group IBGP family evpn signaling

## VXLAN
set protocols evpn encapsulation vxlan
set protocols evpn extended-vni-list 10010
set protocols evpn vni-options vni 10010 vrf-target target:1:10010

## IRB
set interfaces irb unit 10 family inet6 address 2001:db8:overlay:1::2/64
set interfaces irb unit 10 mac 00:00:5e:00:01:01   # anycast MAC

## ES-LAG (all-active multi-homing)
set interfaces ae0 aggregated-ether-options lacp active
set interfaces ae0 aggregated-ether-options lacp periodic fast
set interfaces ae0 esi 00:11:22:33:44:55:66:77:88:99
set interfaces ae0 esi all-active
set interfaces ae0 unit 0 family ethernet-switching interface-mode trunk
set interfaces ae0 unit 0 family ethernet-switching vlan members 10
set interfaces et-0/0/2 ether-options 802.3ad ae0
```

## MX204-2 Configuration (VTEP, ES-LAG peer)

```
set system host-name mx204-2
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:2::1
set protocols bgp group IBGP neighbor 2001:db8:0::1
set protocols bgp group IBGP family evpn signaling

set protocols evpn encapsulation vxlan
set protocols evpn extended-vni-list 10010

## ES-LAG — same ESI as MX204-1 (shared CE)
set interfaces ae0 esi 00:11:22:33:44:55:66:77:88:99
set interfaces ae0 esi all-active
set interfaces ae0 unit 0 family ethernet-switching interface-mode trunk
set interfaces ae0 unit 0 family ethernet-switching vlan members 10
```

## MX204-3 Configuration (VTEP + GENEVE endpoint)

```
set system host-name mx204-3
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 2001:db8:3::1
set protocols bgp group IBGP neighbor 2001:db8:0::1
set protocols bgp group IBGP family evpn signaling

set protocols evpn encapsulation vxlan
set protocols evpn extended-vni-list 10010

## GENEVE tunnel
set interfaces gre unit 0 tunnel source 2001:db8:3::1
set interfaces gre unit 0 tunnel destination 2001:db8:0::1
set interfaces gre unit 0 tunnel encapsulation geneve
set interfaces gre unit 0 tunnel key 20010
```

---

## Verification Commands & Expected Outcomes

### VXLAN over IPv6 (VXLANv6 Unicast)
```
show nve peers
show nve vni
show vxlan interface nve1
show ipv6 route 2001:db8:1::1
```
**Expected:** NVE peers show all MX204 VTEPs with IPv6 addresses; VNI 10010 `up`; VXLAN UDP/4789 encapsulation confirmed via `tcpdump` (outer IPv6, inner Ethernet); BGP Type-3 IMET routes present.

### VXLAN EVPN over IPv6
```
show bgp l2vpn evpn summary
show bgp l2vpn evpn route-type 2
show bgp l2vpn evpn route-type 3
show mac address-table vlan 10
```
**Expected:** BGP EVPN sessions established; Type-2 (MAC/IP) and Type-3 (IMET) routes exchanged; MAC learning suppressed (BGP-based); ARP/ND suppression active (no ARP flooding across fabric).

### EVPN L3 Gateway (IRB)
```
show ipv6 route vrf OVERLAY
show bgp l2vpn evpn route-type 5
show ip arp evpn
ping6 2001:db8:overlay:1::10 vrf OVERLAY source 2001:db8:overlay:1::1
```
**Expected:** IRB gateway responds to ND on Vlan10; Type-5 IP prefix routes distributed; inter-subnet routing via distributed anycast gateway works without flooding; host-to-host pings across subnets transit OCNOS IRB.

### EVPN Multi-Homing (ES-LAG)
```
show evpn ethernet-segment
show bgp l2vpn evpn route-type 1
show bgp l2vpn evpn route-type 4
show evpn designated-forwarder
```
**Expected:** ES-LAG with ESI `00:11:22:33:44:55:66:77:88:99` visible; Type-1 (Ethernet Auto-Discovery) and Type-4 (Ethernet Segment) routes exchanged between OCNOS, MX204-1, and MX204-2; DF election completes; split-horizon filter active.

Failure test:
```bash
# Shut OCNOS et-0/0/0 (one ES-LAG member)
interface et-0/0/0
 shutdown
# Expect mass MAC withdrawal, MX204-2 takes over as DF
show evpn designated-forwarder
show bgp l2vpn evpn route-type 1
```
**Expected:** MX204-2 becomes sole DF within 50ms; mass MAC withdrawal Type-1 routes sent; no traffic interruption beyond failover window.

### GENEVE over IPv6
```
show interface geneve1
show tunnel geneve1
```
**Expected:** GENEVE tunnel `up` between OCNOS (`2001:db8:0::1`) and MX204-3 (`2001:db8:3::1`); VNI 20010 present; MTU accounts for GENEVE overhead; traffic forwarded at line rate without CPU punting; PMTUD functions correctly with additional encap overhead.

---

## Compliance Tracker Categories
- Overlay Networks & EVPN — VXLANv6, VXLAN EVPN, IRB/L3GW, ES-LAG, GENEVE
