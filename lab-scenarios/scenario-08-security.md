# Scenario 8 — Security

## Coverage (10 test cases)
| Category | Test Case |
|---|---|
| Security, Transition & Hardware | IPv6 ACLs & First-Hop Security |
| Security, Transition & Hardware | Simultaneous IPv4 and IPv6 ACL Enforcement |
| Security, Transition & Hardware | IPv6 ACL Ingress and Egress Direction Restrictions |
| Security, Transition & Hardware | Hardware / ASIC Datapath |
| Security, Transition & Hardware | CoPP (Control Plane Policing) for IPv6 |
| Security, Transition & Hardware | IPv6 uRPF (Unicast Reverse Path Forwarding) |
| Link Security (MACsec) | MACsec Link Encryption (IEEE 802.1AE) |
| Link Security (MACsec) | MKA (MACsec Key Agreement) over IPv6 |
| Link Security (MACsec) | MACsec with SRv6 / VXLAN Underlay |
| Security, Transition & Hardware | IPv6 Transition Mechanisms |

## Topology

```
  ┌──────────────────────────────────────────────────────┐
  │  OCNOS DUT                                           │
  │  lo: 2001:db8:0::1/128                               │
  │  MACsec: et-0/0/0 (to MX204-1) — GCM-AES-256        │
  │  uRPF strict: et-0/0/1, et-0/0/2                    │
  │  CoPP: rate-limit ICMPv6/BGP/OSPFv3/IS-IS/ND        │
  └──────┬──────────────┬──────────────┬─────────────────┘
   et-0/0/0 (MACsec) et-0/0/1 (uRPF) et-0/0/2 (ACL test)
  2001:db8:12::/127  2001:db8:13::/127 2001:db8:14::/127
         │                  │                  │
  ┌──────▼──┐         ┌──────▼──┐       ┌──────▼──┐
  │MX204-1  │         │MX204-2  │       │MX204-3  │
  │MACsec   │         │spoofed  │       │ACL test │
  │peer     │         │src test │       │traffic  │
  └─────────┘         └─────────┘       └─────────┘

  IPv4 ACL and IPv6 ACL both applied on et-0/0/2 simultaneously.
  RA Guard active on et-0/0/2 (untrusted).
  ND Inspection on et-0/0/2.
  DHCPv6 Guard on et-0/0/2.
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

interface Loopback0
 ipv6 address 2001:db8:0::1/128
 isis ipv6 enable

! ── Interfaces ────────────────────────────────────────────────────────────────
interface et-0/0/0
 description TO-MX204-1-MACSEC
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127
 isis ipv6 enable
 macsec network-link               ! MACsec enabled on this link

interface et-0/0/1
 description TO-MX204-2-URPF
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127
 isis ipv6 enable
 ipv6 verify unicast source reachable-via rx   ! uRPF strict mode

interface et-0/0/2
 description TO-MX204-3-ACL-TESTS
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127
 isis ipv6 enable
 ipv6 access-group IPV6-INGRESS-ACL in
 ipv6 access-group IPV6-EGRESS-ACL out
 ip access-group IPV4-INGRESS-ACL in         ! dual-stack simultaneous ACL
 ip access-group IPV4-EGRESS-ACL out

! ── IPv6 ACLs ─────────────────────────────────────────────────────────────────
ipv6 access-list IPV6-INGRESS-ACL
 ! Allow established ICMPv6 ND
 permit icmp any any nd-ns
 permit icmp any any nd-na
 permit icmp any any router-solicitation
 ! Allow BGP, OSPFv3, IS-IS
 permit tcp 2001:db8:14::/127 any eq 179
 permit 89 any any           ! OSPFv3
 permit 124 any any          ! IS-IS (IP proto for IS-IS hellos — link-local only)
 ! Rate-limit ICMPv6 echo
 permit icmp any any echo sequence 10
 permit icmp any any echo-reply sequence 11
 ! Deny spoofed/bogon sources
 deny ipv6 ::/8 any          ! unspecified range
 deny ipv6 ff00::/8 any      ! multicast as source (bogon)
 deny ipv6 2001:db8:99::/48 any   ! simulate spoofed source block
 ! Default permit (test controlled traffic)
 permit ipv6 any any

ipv6 access-list IPV6-EGRESS-ACL
 permit ipv6 2001:db8::/32 any
 deny ipv6 any any log        ! log drops for auditing

! ── Simultaneous IPv4 ACL ─────────────────────────────────────────────────────
ip access-list extended IPV4-INGRESS-ACL
 permit ip 10.0.0.0 0.0.0.255 any
 deny ip any any log

ip access-list extended IPV4-EGRESS-ACL
 permit ip any 10.0.0.0 0.0.0.255
 deny ip any any log

! ── First-Hop Security — RA Guard ─────────────────────────────────────────────
ipv6 nd raguard policy UNTRUSTED
 role router    ! only routers in trusted policy can send RAs
 deny           ! deny all on untrusted

! Apply RA Guard on et-0/0/2 (untrusted)
interface et-0/0/2
 ipv6 nd raguard attach-policy UNTRUSTED

! ── First-Hop Security — ND Inspection ────────────────────────────────────────
ipv6 nd inspection policy ND-INSPECT
 validate source-mac
 drop-unsolicited-na

interface et-0/0/2
 ipv6 nd inspection attach-policy ND-INSPECT

! ── First-Hop Security — DHCPv6 Guard ────────────────────────────────────────
ipv6 dhcp guard policy DHCP-UNTRUSTED
 device-role client           ! only client messages allowed from untrusted

interface et-0/0/2
 ipv6 dhcp guard attach-policy DHCP-UNTRUSTED

! ── CoPP for IPv6 Control Plane ───────────────────────────────────────────────
! Class-maps for control-plane traffic types
class-map match-any COPP-IPV6-ICMP
 match protocol ipv6-icmp

class-map match-any COPP-IPV6-BGP
 match protocol tcp
 match access-group name BGP-PERMIT

class-map match-any COPP-IPV6-OSPF
 match protocol ospfv3

class-map match-any COPP-IPV6-ISIS
 match protocol isis

class-map match-any COPP-IPV6-ND
 match protocol nd

! Policy-map
policy-map COPP-POLICY
 class COPP-IPV6-ND
  police rate 10000 pps conform-action transmit exceed-action drop
 class COPP-IPV6-ICMP
  police rate 5000 pps conform-action transmit exceed-action drop
 class COPP-IPV6-BGP
  police rate 2000 pps conform-action transmit exceed-action drop
 class COPP-IPV6-OSPF
  police rate 2000 pps conform-action transmit exceed-action drop
 class COPP-IPV6-ISIS
  police rate 2000 pps conform-action transmit exceed-action drop
 class class-default
  police rate 1000 pps conform-action transmit exceed-action drop

! Apply CoPP to control-plane
control-plane
 service-policy input COPP-POLICY

! ── uRPF ─────────────────────────────────────────────────────────────────────
! Strict mode on et-0/0/1 (above)
! Loose mode on et-0/0/0 for asymmetric path testing
interface et-0/0/0
 ipv6 verify unicast source reachable-via any   ! loose uRPF

! ── MACsec (IEEE 802.1AE + MKA) ─────────────────────────────────────────────
key chain MACSEC-KEYS macsec
 key 01
  key-octet-string CAFEBABE01234567CAFEBABE01234567CAFEBABE01234567CAFEBABE01234567
  cryptographic-algorithm aes-256-cmac
 !

mka policy MKA-POLICY
 macsec-cipher-suite gcm-aes-256
 key-server-priority 100
 include-icv-indicator
 delay-protection
 !

interface et-0/0/0
 mka policy MKA-POLICY
 mka pre-shared-key key-chain MACSEC-KEYS
 macsec replay-protection window-size 64
 macsec encrypt

! ── SRv6 over MACsec ─────────────────────────────────────────────────────────
! SRv6 locator on the MACsec-protected link toward MX204-1
segment-routing srv6
 locators
  locator MACSEC-LINK
   prefix fcbb:0:1::/48
interface et-0/0/0
 ipv6 address 2001:db8:12::0/127

! ── IPv6 Transition Mechanisms ────────────────────────────────────────────────
! NAT64 (stateful)
ip nat inside source static tcp 192.168.1.10 80 2001:db8:64::10 80

! DNS64
ip dns64 2001:db8:64::/96

! GRE tunnel (IPv6 transport)
interface Tunnel200
 description GRE-over-IPv6
 ipv6 address 2001:db8:tun::1/127
 tunnel source 2001:db8:0::1
 tunnel destination 2001:db8:3::1
 tunnel mode gre ipv6
```

---

## MX204-1 Configuration (MACsec peer)

```
set system host-name mx204-1
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## MACsec (IEEE 802.1AE, GCM-AES-256)
set security macsec connectivity-association CA1 security-mode static-cak
set security macsec connectivity-association CA1 pre-shared-key ckn CAFEBABE01234567CAFEBABE0123456701234567CAFEBABE01234567CAFEBABE01
set security macsec connectivity-association CA1 pre-shared-key cak CAFEBABE01234567CAFEBABE01234567CAFEBABE01234567CAFEBABE01234567
set security macsec connectivity-association CA1 cipher-suite gcm-aes-256
set security macsec interface et-0/0/0 connectivity-association CA1

## SRv6 over MACsec — locator visible over encrypted link
set routing-options source-packet-routing srv6 locator MAIN fcbb:0:2::/48
set protocols isis source-packet-routing srv6 locator MAIN end-sid fcbb:0:2:0001::
```

## MX204-2 Configuration (uRPF source spoofing test)

```
set system host-name mx204-2
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## uRPF test: generate packets with spoofed source to trigger OCNOS uRPF drop
## (use traffic generator or hping6 with spoofed src during test)
## MX204-2 should not see replies when OCNOS drops the spoofed-source packets
```

## MX204-3 Configuration (ACL and FHS test traffic source)

```
set system host-name mx204-3
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

## IS-IS
set protocols isis interface et-0/0/0.0 level 2
set protocols isis interface lo0.0 passive level 2

## ACL test — MX204-3 sends permitted and denied traffic for ACL verification
set policy-options prefix-list PERMITTED-SRC 2001:db8:14::1/127
set policy-options prefix-list SPOOFED-SRC 2001:db8:99::/48

## FHS test — send RA toward OCNOS et-0/0/2 (should be blocked by RA Guard)
set protocols router-advertisement interface et-0/0/0.0 min-interval 3
set protocols router-advertisement interface et-0/0/0.0 max-interval 10
```

---

## Verification Commands & Expected Outcomes

### IPv6 ACLs & First-Hop Security
```
show ipv6 access-list IPV6-INGRESS-ACL
show ipv6 access-list IPV6-EGRESS-ACL
show ipv6 nd raguard policy UNTRUSTED
show ipv6 nd inspection policy ND-INSPECT
show ipv6 dhcp guard policy DHCP-UNTRUSTED
```
**Expected:** ACL counters increment for permitted and denied entries; RA from MX204-3 blocked by RA Guard (counter `RAs dropped`); spoofed ND Neighbor Advertisements rejected by ND Inspection; DHCPv6 Advertise/Reply from untrusted port blocked.

### Simultaneous IPv4 and IPv6 ACL Enforcement
```
show ip access-list IPV4-INGRESS-ACL
show ipv6 access-list IPV6-INGRESS-ACL
show platform hardware tcam statistics
```
**Expected:** Both ACL counters active simultaneously on et-0/0/2; `show platform hardware tcam` shows both rulesets installed in TCAM without exhaustion; line-rate forwarding for permitted traffic confirmed via interface PPS counters.

### IPv6 ACL Ingress and Egress Direction Restrictions
```
show ipv6 access-list IPV6-EGRESS-ACL
show interfaces et-0/0/2 | include drop
```
**Expected:** Egress ACL `IPV6-EGRESS-ACL` applied and counting; `deny any any` counter increments for non-matching traffic; hardware (not CPU) enforces egress ACL (verify via `show platform hardware` drop counters vs CPU queue).

### Hardware / ASIC Datapath
```
show ipv6 traffic
show platform hardware qfp active statistics
show platform hardware qfp active feature acl statistics
show interfaces et-0/0/0 | include "input rate|output rate"
```
**Expected:** IPv6 forwarding at wire rate (100G line rate); CPU receive queue (`qfp punt statistics`) shows only legitimate control traffic; forwarded packets per second matches injected rate; no anomalous CPU spikes.

### CoPP for IPv6
```
show policy-map control-plane
show policy-map control-plane class COPP-IPV6-ND
show policy-map control-plane class COPP-IPV6-ICMP
```
**Expected:** Conform/exceed counters visible; during ICMPv6 flood (send 100k pps ICMP toward OCNOS) — exceeded-action `drop` kicks in above 5000pps; BGP/OSPFv3/IS-IS adjacencies remain stable (not starved by ICMPv6 flood).

CoPP flood test:
```bash
# From MX204-3, flood ICMPv6 echo at high rate
hping3 --ipv6 --icmptype 128 --flood 2001:db8:14::0
# On OCNOS
show policy-map control-plane class COPP-IPV6-ICMP
show bgp summary   # verify still Established
show isis neighbors  # verify still up
```
**Expected:** BGP and IS-IS adjacencies not dropped; ICMPv6 flood rate-limited to 5000pps; `exceed` counter increments showing excess packets dropped.

### IPv6 uRPF
```
show ipv6 interface et-0/0/1 | include uRPF
show ipv6 traffic | include uRPF
show platform hardware qfp active feature urpf statistics
```
**Expected:** Strict uRPF on et-0/0/1 drops packets sourced from `2001:db8:99::/48` (spoofed, not in RIB); loose uRPF on et-0/0/0 passes asymmetric paths; `show ipv6 traffic` shows `uRPF drops` counter incrementing for spoofed packets.

### MACsec Link Encryption
```
show macsec summary
show macsec interface et-0/0/0
show macsec statistics interface et-0/0/0
```
**Expected:** MACsec `Secured` on et-0/0/0; `show macsec interface` shows GCM-AES-256 cipher; TX/RX encrypted octet counters incrementing; management SSH/SNMP traffic accessible via IPv6 over encrypted link without plaintext bypass.

### MKA over IPv6
```
show mka sessions
show mka policy MKA-POLICY
show mka statistics interface et-0/0/0
```
**Expected:** MKA session `Secured`; CAK/CKN lifecycle visible; SAK generated and distributed; `Key Server Priority` shown; trigger SAK rekey:
```
clear macsec counters interface et-0/0/0
# Wait for SAK rotation
show mka sessions detail | include "Rekey|SAK"
```
**Expected:** SAK rotates without traffic interruption; no packet loss during rekey window.

### MACsec with SRv6 / VXLAN Underlay
```
show macsec interface et-0/0/0 detail
show segment-routing srv6 forwarding
```
**Expected:** SRv6 SRH present above MACsec layer (MACsec encrypts entire L2 frame including SRH); no plaintext SRH visible in capture outside MACsec boundary; SRv6 End.X adjacency over MACsec-protected link forwards correctly.

### IPv6 Transition Mechanisms
```
show ip nat translations
show ip dns64
show interface Tunnel200
```
**Expected:** NAT64 translation entries for synthetic IPv4 traffic; DNS64 synthesizes AAAA records; GRE tunnel over IPv6 `up`; tunneled IPv4 traffic forwarded correctly; document which mechanisms are hardware-accelerated vs software.

---

## Compliance Tracker Categories
- Security, Transition & Hardware — IPv6 ACLs, FHS, dual-stack ACL, ASIC datapath, CoPP, uRPF, Transition
- Link Security (MACsec) — MACsec encryption, MKA, MACsec+SRv6
