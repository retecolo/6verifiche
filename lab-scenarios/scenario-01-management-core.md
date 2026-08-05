# Scenario 1 — Management & Core IPv6

## Coverage (13 test cases)
| Category | Test Case |
|---|---|
| Network Management & Telemetry | SSH (SSHv2) |
| Network Management & Telemetry | RADIUS |
| Network Management & Telemetry | TACACS+ |
| Network Management & Telemetry | Syslog |
| Network Management & Telemetry | SNMP |
| Network Management & Telemetry | NetFlow / IPFIX / sFlow |
| Network Management & Telemetry | NTP |
| Network Management & Telemetry | DNS |
| Core IPv6 Protocols & Features | ICMPv6 & Neighbor Discovery |
| Core IPv6 Protocols & Features | Addressing & SLAAC / DHCPv6 |
| Core IPv6 Protocols & Features | Path MTU Discovery (PMTUD) |
| Core IPv6 Protocols & Features | DHCPv6 Relay |
| Core IPv6 Protocols & Features | Router Advertisement Suppression |

## Topology

```
                      ┌─────────────────────────┐
                      │   Management Network      │
                      │  2001:db8:mgmt::/64       │
                      │  NTP / Syslog / DNS /     │
                      │  RADIUS / TACACS+ / SNMP  │
                      │  Flow Collector           │
                      └──────────┬────────────────┘
                                 │
                    ┌────────────▼────────────────┐
                    │      OCNOS DUT              │
                    │  Loopback0: 2001:db8:0::1/128│
                    │  mgmt0: 2001:db8:mgmt::10/64│
                    └──┬────────────┬──────────┬──┘
              et-0/0/0 │    et-0/0/1│  et-0/0/2│
         100G P2P link │  100G P2P  │  100G P2P│
      2001:db8:12::/127│ 2001:db8:13::/127  2001:db8:14::/127
                       │            │          │
               ┌───────▼──┐ ┌───────▼──┐ ┌───▼──────┐
               │  MX204-1 │ │  MX204-2 │ │  MX204-3 │
               │ ::1 side  │ │ ::1 side  │ │ ::1 side │
               └──────────┘ └──────────┘ └──────────┘

Address plan:
  OCNOS mgmt:         2001:db8:mgmt::10/64
  OCNOS loopback:     2001:db8:0::1/128
  OCNOS ↔ MX204-1:   2001:db8:12::0/127 (OCNOS) / ::1 (MX1)
  OCNOS ↔ MX204-2:   2001:db8:13::0/127 (OCNOS) / ::1 (MX2)
  OCNOS ↔ MX204-3:   2001:db8:14::0/127 (OCNOS) / ::1 (MX3)
  DHCPv6 server:      2001:db8:mgmt::100
  NTP server:         2001:db8:mgmt::123
  Syslog server:      2001:db8:mgmt::514
  SNMP manager:       2001:db8:mgmt::161
  RADIUS server:      2001:db8:mgmt::1812
  TACACS+ server:     2001:db8:mgmt::49
  Flow collector:     2001:db8:mgmt::2055
```

---

## OCNOS Configuration

```
! ── Hostname & management interface ─────────────────────────────────────────
hostname ocnos-dut

interface Loopback0
 ipv6 address 2001:db8:0::1/128
 no shutdown

interface mgmt0
 ipv6 address 2001:db8:mgmt::10/64
 no shutdown

! ── IPv6 static default via management ───────────────────────────────────────
ipv6 route ::/0 2001:db8:mgmt::1

! ── SSH ──────────────────────────────────────────────────────────────────────
ip ssh version 2
line vty 0 15
 transport input ssh
 ipv6 access-class MGMT-V6 in
!
ipv6 access-list MGMT-V6
 permit ipv6 2001:db8:mgmt::/64 any

! ── AAA / RADIUS ─────────────────────────────────────────────────────────────
aaa new-model
aaa authentication login default group radius local
aaa authorization exec default group radius local
aaa accounting exec default start-stop group radius

radius-server host 2001:db8:mgmt::1812 auth-port 1812 acct-port 1813
radius-server key RADIUS-SECRET

! ── AAA / TACACS+ ─────────────────────────────────────────────────────────────
tacacs-server host 2001:db8:mgmt::49
tacacs-server key TACACS-SECRET

! ── Syslog ───────────────────────────────────────────────────────────────────
logging host 2001:db8:mgmt::514
logging trap informational
logging facility local7
logging source-interface Loopback0

! ── SNMP ─────────────────────────────────────────────────────────────────────
snmp-server community PUBLIC ro
snmp-server host 2001:db8:mgmt::161 traps version 2c PUBLIC
snmp-server enable traps
snmp-server ifindex persist

! SNMPv3
snmp-server group V3GROUP v3 priv
snmp-server user V3USER V3GROUP v3 auth sha AUTH-PASS priv aes 128 PRIV-PASS
snmp-server host 2001:db8:mgmt::161 version 3 priv V3USER

! ── NetFlow / IPFIX ──────────────────────────────────────────────────────────
ip flow-export version 9
ip flow-export destination 2001:db8:mgmt::2055 4739
ip flow-export source Loopback0

interface et-0/0/0
 ip flow ingress
 ip flow egress
 ipv6 flow ingress
 ipv6 flow egress

! ── NTP ──────────────────────────────────────────────────────────────────────
ntp server 2001:db8:mgmt::123 prefer
ntp source Loopback0

! ── DNS ──────────────────────────────────────────────────────────────────────
ip domain-name lab.example.com
ip name-server 2001:db8:mgmt::53

! ── Physical links to MX204 peers ─────────────────────────────────────────────
interface et-0/0/0
 description TO-MX204-1
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:12::0/127
 ipv6 nd ra-suppress    ! suppress RA toward router peers

interface et-0/0/1
 description TO-MX204-2
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:13::0/127
 ipv6 nd ra-suppress

interface et-0/0/2
 description TO-MX204-3
 mtu 9192
 no shutdown
 ipv6 address 2001:db8:14::0/127
 ipv6 nd ra-suppress

! ── DHCPv6 relay (toward management DHCPv6 server) ──────────────────────────
interface et-0/0/0
 ipv6 dhcp relay destination 2001:db8:mgmt::100
```

---

## MX204-1 Configuration

```
## Junos — MX204-1 baseline for Scenario 1
set system host-name mx204-1
set system ntp server 2001:db8:mgmt::123
set system syslog host 2001:db8:mgmt::514 any any
set system syslog host 2001:db8:mgmt::514 source-address 2001:db8:mgmt::11

set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:12::1/127

set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

## Disable RA on peer-facing link
set protocols router-advertisement interface et-0/0/0.0 no-advertisements

## SNMPv2c
set snmp community PUBLIC authorization read-only
set snmp trap-group TRAPS version v2
set snmp trap-group TRAPS targets 2001:db8:mgmt::161

## SNMPv3
set snmp v3 usm local-engine user V3USER authentication-sha authentication-password AUTH-PASS
set snmp v3 usm local-engine user V3USER privacy-aes128 privacy-password PRIV-PASS
set snmp v3 notify-filter all-objects oid 1 include

## RADIUS
set system radius-server 2001:db8:mgmt::1812 secret RADIUS-SECRET

## TACACS+
set system tacacs-server 2001:db8:mgmt::49 secret TACACS-SECRET
```

## MX204-2 Configuration

```
set system host-name mx204-2
set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:13::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:2::1/128
set protocols router-advertisement interface et-0/0/0.0 no-advertisements
set system ntp server 2001:db8:mgmt::123
set system syslog host 2001:db8:mgmt::514 any any
```

## MX204-3 Configuration

```
set system host-name mx204-3
set interfaces et-0/0/0 description TO-OCNOS
set interfaces et-0/0/0 mtu 9192
set interfaces et-0/0/0 unit 0 family inet6 address 2001:db8:14::1/127
set interfaces lo0 unit 0 family inet6 address 2001:db8:3::1/128
set protocols router-advertisement interface et-0/0/0.0 no-advertisements
set system ntp server 2001:db8:mgmt::123
set system syslog host 2001:db8:mgmt::514 any any
```

---

## Verification Commands & Expected Outcomes

### SSH (SSHv2)
```bash
# From management host
ssh -6 admin@2001:db8:mgmt::10
ssh -6 admin@2001:db8:0::1     # via loopback
# From OCNOS, outbound
ssh -6 admin@2001:db8:mgmt::200
```
**Expected:** Sessions establish; `show ssh session` shows IPv6 peer addresses; no IPv4 fallback.

### RADIUS
```
# On OCNOS
show aaa servers
show radius server 2001:db8:mgmt::1812
```
**Expected:** Server reachable over IPv6; `Access-Accept` received on authentication attempt; accounting records sent.

### TACACS+
```
show tacacs-server
debug tacacs
```
**Expected:** TCP session to `[2001:db8:mgmt::49]:49` established; auth/authz packets acknowledged.

### Syslog
```
show logging
```
**Expected:** `Logging to 2001:db8:mgmt::514, 0 message(s) dropped, 0 flushes, N messages logged` — verify messages arrive at syslog server.

### SNMP
```bash
# From management host (SNMPv2c)
snmpget -v 2c -c PUBLIC udp6:[2001:db8:mgmt::10] sysDescr.0

# SNMPv3
snmpwalk -v 3 -u V3USER -l authPriv -a SHA -A AUTH-PASS -x AES -X PRIV-PASS \
  udp6:[2001:db8:mgmt::10] ifDescr
```
**Expected:** OID data returned; traps received at `2001:db8:mgmt::161` upon interface event.

### NetFlow / IPFIX
```
show ip flow export
show ipv6 flow export
show ip cache flow
```
**Expected:** Active flows exported; collector at `2001:db8:mgmt::2055` receives datagrams; both IPv4 and IPv6 flow records present.

### NTP
```
show ntp status
show ntp associations
```
**Expected:** `Clock is synchronized, stratum X, reference is 2001:db8:mgmt::123`; offset < 100ms.

### DNS
```
show hosts
nslookup lab.example.com
ping6 lab.example.com
```
**Expected:** AAAA record resolved via `2001:db8:mgmt::53`; ping6 resolves and succeeds.

### ICMPv6 & Neighbor Discovery
```
ping6 2001:db8:12::1 source 2001:db8:12::0    ! to MX204-1
show ipv6 neighbors
show ipv6 interface et-0/0/0
```
**Expected:** 5/5 ping replies; ND table shows MX204-1 link-local as REACH; RS/RA/NS/NA visible in `debug ipv6 nd`.

### Addressing & SLAAC / DHCPv6
```
show ipv6 interface brief
show ipv6 dhcp relay statistics
```
**Expected:** GUA and link-local assigned on all interfaces; relay statistics show forwarded Solicit/Request/Advertise/Reply messages.

### Path MTU Discovery (PMTUD)
```bash
# Send oversized packet from MX204-1 through OCNOS
ping6 2001:db8:14::1 size 9000 do-not-fragment count 5
# On OCNOS observe ICMPv6 PTB
show ipv6 traffic | include "Packet Too Big"
```
**Expected:** ICMPv6 Type 2 "Packet Too Big" generated by OCNOS; sender reduces MSS; OCNOS never fragments transit packet.

### DHCPv6 Relay
```
show ipv6 dhcp relay interface et-0/0/0
show ipv6 dhcp relay statistics
```
**Expected:** relay-forward/relay-reply counts increment; server at `2001:db8:mgmt::100` receives relayed packets with Interface-ID option.

### Router Advertisement Suppression
```
show ipv6 interface et-0/0/0 | include RA
debug ipv6 nd
```
**Expected:** No RA transmitted on `et-0/0/0`/`et-0/0/1`/`et-0/0/2` (confirmed via Wireshark or debug); ND adjacencies still form using NS/NA.

---

## Compliance Tracker Categories
- Network Management & Telemetry — SSH, RADIUS, TACACS+, Syslog, SNMP, NetFlow, NTP, DNS
- Core IPv6 Protocols & Features — ICMPv6/ND, Addressing/SLAAC, PMTUD, DHCPv6 Relay, RA Suppression
