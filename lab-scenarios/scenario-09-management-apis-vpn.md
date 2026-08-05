# Scenario 9 — Management APIs & VPN/Tunneling

## Coverage (10 test cases)
| Category | Test Case |
|---|---|
| Modern Management APIs & Telemetry | NETCONF over IPv6 |
| Modern Management APIs & Telemetry | RESTCONF over IPv6 |
| Modern Management APIs & Telemetry | gNMI / gRPC Streaming Telemetry over IPv6 |
| Modern Management APIs & Telemetry | OpenConfig Model Support over IPv6 |
| Modern Management APIs & Telemetry | gRIBI / Programmable FIB over IPv6 |
| VPN & Tunneling | IPsec IKEv2 over IPv6 |
| VPN & Tunneling | GRE over IPv6 (GREv6) |
| VPN & Tunneling | L2TPv3 over IPv6 |
| Connectivity & Validation | Certifications & Standards |
| Network Management & Telemetry | Telnet (legacy, OPTIONAL) |

## Topology

```
  ┌─────────────────────────────────────────────────────────────┐
  │  OCNOS DUT                                                  │
  │  lo: 2001:db8:0::1/128                                      │
  │  mgmt0: 2001:db8:mgmt::10/64                                │
  │  NETCONF: port 830 over SSH                                  │
  │  RESTCONF: port 443 (HTTPS)                                  │
  │  gNMI: port 9339                                             │
  │  IPsec: IKEv2 tunnel to MX204-1                             │
  │  GRE: tunnel to MX204-2                                     │
  │  L2TPv3: pseudowire to MX204-3                              │
  └────────────────┬──────────────┬──────────────┬──────────────┘
  et-0/0/0        │          et-0/0/1       et-0/0/2
  2001:db8:12::/127         2001:db8:13::/127   2001:db8:14::/127
  IPsec tunnel              GRE tunnel         L2TPv3 PW
         │                        │                   │
  ┌──────▼──┐              ┌──────▼──┐         ┌──────▼──┐
  │MX204-1  │              │MX204-2  │         │MX204-3  │
  │IKEv2    │              │GRE peer │         │L2TPv3   │
  │peer     │              │         │         │peer     │
  └─────────┘              └─────────┘         └─────────┘

  Management host (2001:db8:mgmt::200) runs:
    - NETCONF client (ncclient / netconf-console)
    - RESTCONF client (curl/Python)
    - gNMI collector (gnmic)
    - gRIBI client
```

---

## OCNOS Configuration

```
! ── Interfaces ────────────────────────────────────────────────────────────────
interface et-0/0/0
 description TO-MX204-1-IPSEC
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127

interface et-0/0/1
 description TO-MX204-2-GRE
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127

interface et-0/0/2
 description TO-MX204-3-L2TPV3
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127

interface Loopback0
 ipv6 address 2001:db8:0::1/128

interface mgmt0
 ipv6 address 2001:db8:mgmt::10/64

! ── NETCONF over IPv6 (RFC 6241) ─────────────────────────────────────────────
! NETCONF runs over SSHv2 on port 830
netconf-yang
netconf ssh

ip ssh version 2
line vty 0 15
 transport input ssh

! Verify with: netconf-console or ncclient from 2001:db8:mgmt::200

! ── RESTCONF over IPv6 (RFC 8040) ────────────────────────────────────────────
! RESTCONF over HTTPS on port 443
restconf
!
ip http server
ip http secure-server
ip http authentication local
! OCNOS listens on [2001:db8:mgmt::10]:443

! ── gNMI / gRPC Streaming Telemetry over IPv6 ────────────────────────────────
gnmi-yang
grpc port 9339
grpc no-tls   ! or configure TLS cert for production
!
! Subscribe paths: /interfaces/interface/state/counters
!                  /network-instances/network-instance/protocols/protocol/bgp/neighbors
!                  /routing-policy/...

! ── gRIBI / Programmable FIB over IPv6 ───────────────────────────────────────
! gRIBI shares the gRPC port; enable if OCNOS supports it
gribi
 aft-override    ! allow gRIBI to override RIB-computed FIB entries

! ── Telnet over IPv6 (OPTIONAL / legacy) ─────────────────────────────────────
line vty 0 15
 transport input ssh telnet

! ── IPsec IKEv2 over IPv6 (RFC 7296) ────────────────────────────────────────
crypto ikev2 proposal IKEv2-PROP
 encryption aes-cbc-256
 integrity sha512
 group 20

crypto ikev2 policy IKEv2-POL
 proposal IKEv2-PROP
 match fvrf global

crypto ikev2 keyring IKEv2-KR
 peer MX204-1
  address 2001:db8:12::1
  pre-shared-key IPSEC-SECRET
 !

crypto ikev2 profile IKEv2-PROFILE
 match address local 2001:db8:12::0
 match identity remote address 2001:db8:12::1
 authentication remote pre-share
 authentication local pre-share
 keyring local IKEv2-KR
 dpd 30 5 periodic

crypto ipsec transform-set TS esp-aes 256 esp-sha512-hmac
 mode tunnel

crypto ipsec profile IPSEC-PROFILE
 set ikev2-profile IKEv2-PROFILE
 set transform-set TS
 set pfs group20

interface Tunnel300
 description IPSEC-TO-MX204-1
 ipv6 address 2001:db8:ipsec::1/127
 tunnel source 2001:db8:12::0
 tunnel destination 2001:db8:12::1
 tunnel mode ipsec ipv6
 tunnel protection ipsec profile IPSEC-PROFILE
 no shutdown

! ── GRE over IPv6 (RFC 7676) ─────────────────────────────────────────────────
interface Tunnel400
 description GRE-OVER-IPV6-TO-MX204-2
 ipv6 address 2001:db8:gre::1/127
 tunnel source 2001:db8:13::0
 tunnel destination 2001:db8:13::1
 tunnel mode gre ipv6
 keepalive 10 3
 no shutdown

! GRE tunnel MTU accounts for overhead: physical MTU 9192 - GRE overhead 40 = 9152
interface Tunnel400
 ip mtu 9152
 ipv6 mtu 9152

! ── L2TPv3 over IPv6 (RFC 3931) ──────────────────────────────────────────────
pseudowire-class PW-L2TPV3
 encapsulation l2tpv3
 protocol l2tpv3
 ip local interface et-0/0/2

interface et-0/0/2.500
 encapsulation dot1q 500
 xconnect 2001:db8:14::1 500 pw-class PW-L2TPV3

l2tp-class L2TP-CLASS
 hostname ocnos-dut
 authentication
 password L2TP-SECRET
```

---

## MX204-1 Configuration (IKEv2/IPsec peer)

```
set system host-name mx204-1
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## IKEv2 / IPsec
set security ike proposal IKEv2-PROP authentication-method pre-shared-keys
set security ike proposal IKEv2-PROP dh-group group20
set security ike proposal IKEv2-PROP authentication-algorithm sha512
set security ike proposal IKEv2-PROP encryption-algorithm aes-256-cbc

set security ike policy IKEv2-POL mode main
set security ike policy IKEv2-POL proposals IKEv2-PROP

set security ike gateway IKEv2-GW ike-policy IKEv2-POL
set security ike gateway IKEv2-GW address 2001:db8:12::0
set security ike gateway IKEv2-GW local-address 2001:db8:12::1
set security ike gateway IKEv2-GW pre-shared-key ascii-text IPSEC-SECRET
set security ike gateway IKEv2-GW dead-peer-detection interval 30
set security ike gateway IKEv2-GW dead-peer-detection threshold 5

set security ipsec proposal IPSEC-PROP protocol esp
set security ipsec proposal IPSEC-PROP authentication-algorithm hmac-sha512-256
set security ipsec proposal IPSEC-PROP encryption-algorithm aes-256-cbc

set security ipsec policy IPSEC-POL proposals IPSEC-PROP
set security ipsec policy IPSEC-POL perfect-forward-secrecy keys group20

set security ipsec vpn IPSEC-VPN ike gateway IKEv2-GW
set security ipsec vpn IPSEC-VPN ike ipsec-policy IPSEC-POL
set security ipsec vpn IPSEC-VPN bind-interface st0.0

set interfaces st0 unit 0 family inet6 address 2001:db8:ipsec::2/127

## NETCONF/RESTCONF/gNMI testing (from management host via IPv6)
set system services netconf ssh
set system services rest http port 443
```

## MX204-2 Configuration (GRE peer)

```
set system host-name mx204-2
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128

## GRE over IPv6 tunnel
set interfaces gr-0/0/0 unit 0 tunnel source 2001:db8:13::1
set interfaces gr-0/0/0 unit 0 tunnel destination 2001:db8:13::0
set interfaces gr-0/0/0 unit 0 family inet6 address 2001:db8:gre::2/127
set interfaces gr-0/0/0 unit 0 keepalives interval 10 up-count 3

## GRE MTU
set interfaces gr-0/0/0 unit 0 family inet6 mtu 9152
```

## MX204-3 Configuration (L2TPv3 peer)

```
set system host-name mx204-3
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128

## L2TPv3 pseudowire
set protocols l2circuit neighbor 2001:db8:14::0 interface et-0/0/0.500 virtual-circuit-id 500
set protocols l2circuit neighbor 2001:db8:14::0 interface et-0/0/0.500 encapsulation-type ethernet-vlan

set interfaces et-0/0/0 unit 500 encapsulation vlan-ccc
set interfaces et-0/0/0 unit 500 vlan-id 500
```

---

## Verification Commands & Expected Outcomes

### NETCONF over IPv6
```bash
# From management host
netconf-console --host 2001:db8:mgmt::10 --port 830 --user admin \
  --password PASS --get-config --source running

# Python ncclient
python3 -c "
from ncclient import manager
m = manager.connect(host='2001:db8:mgmt::10', port=830, username='admin',
    password='PASS', hostkey_verify=False)
print(m.get_config('running'))
"
```
**Expected:** `<hello>` capabilities exchanged including `urn:ietf:params:netconf:base:1.1`; `get-config` returns running configuration as XML; `edit-config` modifies config and `commit` persists; `lock`/`unlock` RPCs work; session source shows IPv6 peer.

### RESTCONF over IPv6
```bash
# GET interfaces
curl -6 -s -k -u admin:PASS \
  'https://[2001:db8:mgmt::10]/restconf/data/ietf-interfaces:interfaces' \
  -H 'Accept: application/yang-data+json'

# PATCH BGP neighbor
curl -6 -s -k -X PATCH -u admin:PASS \
  'https://[2001:db8:mgmt::10]/restconf/data/ietf-routing:routing' \
  -H 'Content-Type: application/yang-data+json' \
  -d '{"ietf-routing:routing": {"router-id": "0.0.0.1"}}'
```
**Expected:** HTTP 200/204 responses; JSON/XML data returned correctly; ETag header present; event stream notification delivered over IPv6 SSE.

### gNMI / gRPC Streaming Telemetry
```bash
# Using gnmic tool
gnmic -a [2001:db8:mgmt::10]:9339 --insecure \
  -u admin -p PASS \
  subscribe --path '/interfaces/interface/state/counters' \
  --mode stream --stream-mode sample --sample-interval 10s

# ONCE mode
gnmic -a [2001:db8:mgmt::10]:9339 --insecure \
  subscribe --path '/network-instances/network-instance[name=default]/protocols/protocol/bgp/neighbors' \
  --mode once
```
**Expected:** gNMI session established over IPv6 TCP:9339; STREAM mode delivers counter updates every 10s without interruption; ONCE mode returns single snapshot; POLL mode responds to poll request; on-change mode triggers on interface state change.

### OpenConfig Model Support
```bash
# Check supported models
gnmic -a [2001:db8:mgmt::10]:9339 --insecure capabilities

# Get BGP state via OpenConfig model
gnmic -a [2001:db8:mgmt::10]:9339 --insecure \
  get --path '/network-instances/network-instance[name=default]/protocols/protocol[identifier=BGP][name=BGP]/bgp/neighbors'
```
**Expected:** OpenConfig models listed in capabilities: `openconfig-interfaces`, `openconfig-bgp`, `openconfig-isis`, `openconfig-ospfv2`, `openconfig-mpls`, `openconfig-routing-policy`; operational state returned correctly; config accepted via PATCH.

### gRIBI / Programmable FIB
```bash
# Inject a static IPv6 route via gRIBI
gribi-client -server [2001:db8:mgmt::10]:9340 \
  modify --rib-fib-ack \
  --ipv6-entry 2001:db8:test::/48 --nexthop 2001:db8:14::1

# Verify installation
show ipv6 route 2001:db8:test::/48
ping6 2001:db8:test::1
```
**Expected:** Route injected via gRIBI appears in FIB (`show ipv6 route` shows source `gribi`); traffic forwarded correctly; delete via ModifyRIB removes the entry; hardware FIB updated without IGP disruption.

### IPsec IKEv2 over IPv6
```
show crypto ikev2 sa
show crypto ikev2 sa detail
show crypto ipsec sa
show interface Tunnel300
```
**Expected:** IKEv2 SA `READY`; IKE_SA_INIT and IKE_AUTH exchanges completed over IPv6; ESP SA `ACTIVE` with correct SPI; Dead Peer Detection operational; SAK rekey occurs transparently.

DPD test:
```bash
# Shut et-0/0/0 for 35 seconds (> DPD interval 30s)
interface et-0/0/0
 shutdown
# Wait 35s, then bring back up
 no shutdown
# Verify re-establishment
show crypto ikev2 sa
```
**Expected:** IKEv2 SA drops after DPD timeout; re-establishes within seconds of link recovery; no manual intervention needed.

### GRE over IPv6
```
show interface Tunnel400
show interface Tunnel400 counters
ping6 2001:db8:gre::2 source 2001:db8:gre::1
```
**Expected:** GRE tunnel `up`; keepalives succeeding; ping6 to GRE peer IP succeeds; MTU set to 9152 (9192 - 40 byte GRE overhead); PMTUD generates ICMPv6 PTB correctly when inner packet exceeds tunnel MTU.

### L2TPv3 over IPv6
```
show xconnect all
show l2tpv3 session detail
show bfd neighbors l2tpv3
```
**Expected:** L2TPv3 control connection established using IPv6 transport; session negotiated with virtual-circuit-id 500; Ethernet VLAN frames forwarded across pseudowire; VCCV ping succeeds; VCCV BFD session `Up`.

### Certifications & Standards
```
show version
show platform hardware
show ipv6 neighbors
show ipv6 general-prefix
```
**Expected:** Compile reference table:
- USGv6 Profile — document tested capabilities vs. required/optional items
- IPv6 Ready Logo — note which test IDs map to this scenario's verification commands
- Vendor release notes — confirm documented OCNOS version, confirmed feature set, known limitations
- All MANDATORY test cases passed; RECOMMENDED test cases documented with PASS/FAIL/PARTIAL

### Telnet over IPv6 (OPTIONAL)
```bash
telnet -6 2001:db8:mgmt::10
```
**Expected:** Telnet session establishes over IPv6; login prompt appears; STRONGLY RECOMMENDED: disable after testing via `no transport input telnet` on vty lines.

---

## Compliance Tracker Categories
- Modern Management APIs & Telemetry — NETCONF, RESTCONF, gNMI, OpenConfig, gRIBI
- VPN & Tunneling — IPsec IKEv2, GREv6, L2TPv3
- Connectivity & Validation — Certifications & Standards
- Network Management & Telemetry — Telnet (OPTIONAL)
