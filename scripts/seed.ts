import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

type TestCaseSeed = {
  category: string;
  name: string;
  description: string;
  rfcReference?: string;
  severity: "MANDATORY" | "RECOMMENDED" | "OPTIONAL";
  tags: string[];
};

const TEST_CASES: TestCaseSeed[] = [
  // ── 1. Network Management & Telemetry ────────────────────────────────────────
  {
    category: "Network Management & Telemetry",
    name: "SSH (SSHv2)",
    description:
      "Verify support for incoming and outgoing SSHv2 CLI sessions over an IPv6 transport natively, using both link-local and Global Unicast Addresses.",
    rfcReference: "RFC 4252, RFC 4253",
    severity: "MANDATORY",
    tags: ["management", "ssh", "remote-access"],
  },
  {
    category: "Network Management & Telemetry",
    name: "Telnet",
    description:
      "(Legacy) Verify support for Telnet over IPv6. Strongly discouraged in production environments; test only when explicitly required for legacy compatibility.",
    severity: "OPTIONAL",
    tags: ["management", "remote-access", "legacy"],
  },
  {
    category: "Network Management & Telemetry",
    name: "RADIUS",
    description:
      "Verify the device can encapsulate AAA requests and properly communicate with RADIUS servers over purely IPv6 networks.",
    rfcReference: "RFC 2865, RFC 2866",
    severity: "MANDATORY",
    tags: ["management", "aaa", "authentication"],
  },
  {
    category: "Network Management & Telemetry",
    name: "TACACS+",
    description:
      "Ensure TACACS+ server communication and policy enforcement (authentication, authorization, and accounting) is fully supported over native IPv6.",
    rfcReference: "RFC 8907",
    severity: "MANDATORY",
    tags: ["management", "aaa", "authentication"],
  },
  {
    category: "Network Management & Telemetry",
    name: "Syslog",
    description:
      "Verify the device supports sending system log messages natively to an IPv6-addressed remote Syslog server over UDP/TCP.",
    rfcReference: "RFC 5424",
    severity: "MANDATORY",
    tags: ["management", "logging", "telemetry"],
  },
  {
    category: "Network Management & Telemetry",
    name: "SNMP",
    description:
      "Verify full support for SNMPv2c and SNMPv3 polling, traps, and informs over an IPv6 transport. Confirm MIB object accessibility via IPv6-addressed manager.",
    rfcReference: "RFC 3411, RFC 3412, RFC 3413, RFC 3414",
    severity: "MANDATORY",
    tags: ["management", "monitoring", "telemetry"],
  },
  {
    category: "Network Management & Telemetry",
    name: "NetFlow / IPFIX / sFlow",
    description:
      "Ensure the device can efficiently export flow records representing both IPv4 and IPv6 traffic directly to an IPv6-addressed flow collector.",
    rfcReference: "RFC 7011",
    severity: "RECOMMENDED",
    tags: ["management", "flow-export", "telemetry"],
  },
  {
    category: "Network Management & Telemetry",
    name: "NTP",
    description:
      "Verify time synchronization with IPv6-addressed Network Time Protocol servers. Confirm NTPv4 operation over IPv6 transport.",
    rfcReference: "RFC 5905",
    severity: "MANDATORY",
    tags: ["management", "time-sync", "foundation"],
  },
  {
    category: "Network Management & Telemetry",
    name: "DNS",
    description:
      "Support for standard DNS queries sourced from an IPv6 address, resolving both A and AAAA records. Confirm recursive and iterative query support.",
    rfcReference: "RFC 1035, RFC 3596",
    severity: "MANDATORY",
    tags: ["management", "dns", "foundation"],
  },

  // ── 2. Core IPv6 Protocols & Features ────────────────────────────────────────
  {
    category: "Core IPv6 Protocols & Features",
    name: "ICMPv6 & Neighbor Discovery",
    description:
      "Verify ICMPv6 Echo Request and Echo Reply via ping. Confirm ICMPv6 ND processes: Router Solicitations (RS), Router Advertisements (RA), Neighbor Solicitations (NS), and Neighbor Advertisements (NA).",
    rfcReference: "RFC 4443, RFC 4861",
    severity: "MANDATORY",
    tags: ["core", "icmpv6", "neighbor-discovery"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "Addressing & SLAAC / DHCPv6",
    description:
      "Verify correct generation, application, and lifetime tracking of IPv6 Global Unicast Addresses (GUA) and Link-Local Addresses. Confirm stateless address autoconfiguration (SLAAC) and/or stateful DHCPv6 processing.",
    rfcReference: "RFC 4862, RFC 8415",
    severity: "MANDATORY",
    tags: ["core", "addressing", "slaac", "dhcpv6"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "IPv6 Extension Header Processing",
    description:
      "Verify correct forwarding and termination of packets carrying Hop-by-Hop Options, Routing (SRH per RFC 8754; Type 0 blocked per RFC 5095), and Destination Options headers. Confirm hardware processes or correctly drops each header type at line rate without CPU punting.",
    rfcReference: "RFC 8200, RFC 5095, RFC 8754",
    severity: "MANDATORY",
    tags: ["core", "extension-headers", "data-plane"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "Path MTU Discovery (PMTUD)",
    description:
      "Verify IPv6 PMTUD per RFC 8201: confirm ICMPv6 Packet Too Big messages are generated for oversized transit packets and that the originating node correctly reduces its send size. Confirm the device never fragments transit IPv6 packets in hardware.",
    rfcReference: "RFC 8201",
    severity: "MANDATORY",
    tags: ["core", "pmtud", "fragmentation"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "IPv6 Flow Label",
    description:
      "Verify the device generates, preserves, and uses the 20-bit Flow Label field per RFC 6437. Confirm flow labels are neither zeroed nor rewritten on transit, and that the device uses the flow label as an ECMP hash input.",
    rfcReference: "RFC 6437",
    severity: "RECOMMENDED",
    tags: ["core", "flow-label", "ecmp"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "DHCPv6 Relay",
    description:
      "Verify the device relays DHCPv6 messages between clients on attached links and a remote DHCPv6 server per RFC 8415. Confirm correct relay-forward and relay-reply encapsulation, insertion of the Interface-ID (option 18) and Remote-ID (option 37) options, proper handling of the server unicast address option, and that relay messages are forwarded to the correct server address over an IPv6-only path.",
    rfcReference: "RFC 8415",
    severity: "MANDATORY",
    tags: ["core", "dhcpv6", "relay", "addressing"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "DHCPv6 Prefix Delegation Relay (DHCPv6-PD)",
    description:
      "Verify the device relays DHCPv6 Prefix Delegation (PD) exchanges between requesting routers (downstream CPE) and a delegating DHCPv6-PD server. Confirm correct handling of the IA_PD option (option 25), relay-forward/relay-reply encapsulation across multiple hops, and that delegated prefixes propagate to downstream routers without assignment errors. Test prefix renewal and rebinding paths.",
    rfcReference: "RFC 8415",
    severity: "MANDATORY",
    tags: ["core", "dhcpv6", "prefix-delegation", "relay"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "Router Advertisement Suppression",
    description:
      "Verify the device supports per-interface suppression of Router Advertisements (RAs). Confirm that RA suppress / no-ra configuration prevents unsolicited and solicited RA transmission on untrusted interfaces (e.g., access-facing, host-facing) while leaving RAs active on router-facing uplinks. Confirm RA suppression does not disrupt existing ND adjacencies or SLAAC on interfaces where RAs remain enabled.",
    rfcReference: "RFC 4861",
    severity: "MANDATORY",
    tags: ["core", "router-advertisement", "security", "neighbor-discovery"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "Router Advertisement Options (RDNSS, DNSSL, Route Information)",
    description:
      "Verify support for extended RA options used in SLAAC-only deployments: RFC 8106 Recursive DNS Server (RDNSS, type 25) and DNS Search List (DNSSL, type 31) options for stateless DNS configuration, and RFC 4191 Route Information Option (type 24) for specific-prefix routing to non-default next hops. Confirm that hosts receive and correctly apply these options during SLAAC without requiring DHCPv6.",
    rfcReference: "RFC 8106, RFC 4191",
    severity: "RECOMMENDED",
    tags: ["core", "router-advertisement", "rdnss", "dnssl", "slaac"],
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "RFC 8781 PREF64 RA Option",
    description:
      "Verify support for the PREF64 Router Advertisement option (RFC 8781, RA option type 38) for advertising the in-use NAT64 prefix to hosts. Confirm the device can include the PREF64 option in RAs with a supported prefix length (96, 64, 56, 48, 40, or 32 bits) and a configurable lifetime, enabling hosts to synthesize IPv6 addresses for IPv4 destinations without manual configuration.",
    rfcReference: "RFC 8781",
    severity: "RECOMMENDED",
    tags: ["core", "router-advertisement", "pref64", "nat64", "transition"],
  },

  // ── 3. IPv6 Routing & Forwarding ─────────────────────────────────────────────
  {
    category: "IPv6 Routing & Forwarding",
    name: "RIPng",
    description:
      "Ensure RIPng builds neighbor adjacencies properly via link-local IPv6 addresses. Verify routing table entries, updates, and metrics are functioning correctly.",
    rfcReference: "RFC 2080",
    severity: "OPTIONAL",
    tags: ["routing", "ripng"],
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "OSPFv3",
    description:
      "Verify OSPFv3 neighbour adjacencies establish correctly on required link-local interfaces. Confirm OSPFv3 routes (intra-area, inter-area, and external) are accurately calculated and inserted into the routing table.",
    rfcReference: "RFC 5340",
    severity: "MANDATORY",
    tags: ["routing", "ospf"],
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "IS-IS (IPv6 Address Family)",
    description:
      "Verify that IPv6 address families are correctly configured and successfully routed via the IS-IS topology. Confirm IPv6 prefixes are exchanged and installed.",
    rfcReference: "RFC 5308",
    severity: "MANDATORY",
    tags: ["routing", "isis"],
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "MP-BGP",
    description:
      "Verify BGP peerings (eBGP and iBGP) establish over IPv6 TCP transport. Confirm exchange of IPv6 Network Layer Reachability Information (NLRI) via the IPv6 address family.",
    rfcReference: "RFC 4760, RFC 2545",
    severity: "MANDATORY",
    tags: ["routing", "bgp"],
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "BGP ADD-PATH for IPv6",
    description:
      "Verify BGP Additional Paths (RFC 7911) for the IPv6 unicast address family. Confirm the device advertises and receives multiple paths for the same prefix, enabling better ECMP utilization and faster convergence on path withdrawal.",
    rfcReference: "RFC 7911",
    severity: "RECOMMENDED",
    tags: ["routing", "bgp", "add-path"],
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "BGP Labeled Unicast (BGP-LU) for IPv6",
    description:
      "Verify BGP Labeled Unicast (RFC 3107) for IPv6 prefixes. Confirm label binding advertisement, label stack imposition, and use of labeled IPv6 paths for inter-AS or seamless MPLS forwarding without IPv4 dependency.",
    rfcReference: "RFC 3107",
    severity: "RECOMMENDED",
    tags: ["routing", "bgp", "mpls", "labeled-unicast"],
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "IPv4 NLRI with IPv6 Next Hop (RFC 8950)",
    description:
      "Verify BGP advertisement of IPv4 Network Layer Reachability Information (NLRI) with an IPv6 next hop per RFC 8950 (which updates RFC 5549). Confirm the device can send and receive IPv4 unicast prefixes encoded in the MP_REACH_NLRI attribute with an IPv6 next hop address, enabling IPv4 reachability across an IPv6-only underlay without a parallel IPv4 BGP session or IPv4 underlay addresses.",
    rfcReference: "RFC 8950, RFC 5549",
    severity: "MANDATORY",
    tags: ["routing", "bgp", "ipv4", "ipv6-next-hop", "transition"],
  },

  // ── 4. Security, Transition & Hardware ───────────────────────────────────────
  {
    category: "Security, Transition & Hardware",
    name: "IPv6 ACLs & First-Hop Security",
    description:
      "Verify hardware support for robust IPv6 Access Control Lists (ACLs) processed at line-rate. Check for First-Hop Security capabilities including RA Guard, ND Inspection, and DHCPv6 Guard.",
    rfcReference: "RFC 6105",
    severity: "MANDATORY",
    tags: ["security", "acl", "first-hop-security"],
  },
  {
    category: "Security, Transition & Hardware",
    name: "Simultaneous IPv4 and IPv6 ACL Enforcement",
    description:
      "Verify the device can apply both IPv4 and IPv6 ACLs concurrently on the same interface at line rate. Confirm that enabling IPv6 ACLs does not require removing or disabling existing IPv4 ACLs, and that both rulesets are processed in hardware (TCAM) without resource exhaustion, performance degradation, or CPU punting.",
    severity: "MANDATORY",
    tags: ["security", "acl", "ipv4", "hardware", "dual-stack"],
  },
  {
    category: "Security, Transition & Hardware",
    name: "IPv6 ACL Ingress and Egress Direction Restrictions",
    description:
      "Verify support for IPv6 ACL application in both ingress and egress directions on all forwarding interfaces. Document any hardware or ASIC restrictions on egress IPv6 ACLs (e.g., limited TCAM entries, no egress support on specific line cards). Confirm restrictions are disclosed in vendor release notes and that ingress ACLs are fully supported at line rate on all platforms.",
    severity: "RECOMMENDED",
    tags: ["security", "acl", "egress", "ingress", "hardware"],
  },
  {
    category: "Security, Transition & Hardware",
    name: "Hardware / ASIC Datapath",
    description:
      "Ensure hardware natively forwards IPv6 traffic in ASIC/datapath rather than punting to the CPU. Evaluate IPv6 hardware multicast capabilities (e.g., MLDv1/MLDv2 snooping).",
    severity: "MANDATORY",
    tags: ["hardware", "datapath", "performance"],
  },
  {
    category: "Security, Transition & Hardware",
    name: "IPv6 Transition Mechanisms",
    description:
      "Where explicitly required, test dual-stack capabilities and transition overlays such as NAT64/DNS64 or IP-in-IP GRE tunnelling. Document which mechanisms are supported in hardware vs. software.",
    rfcReference: "RFC 6146, RFC 6147",
    severity: "OPTIONAL",
    tags: ["transition", "nat64", "dual-stack"],
  },
  {
    category: "Security, Transition & Hardware",
    name: "CoPP (Control Plane Policing) for IPv6",
    description:
      "Verify hardware rate-limiting and policing of IPv6 control-plane traffic (ICMPv6, BGP, OSPFv3, IS-IS, ND) to protect the CPU from flooding attacks. Confirm IPv6-specific CoPP policies are enforced at line rate and do not impact legitimate control-plane adjacencies.",
    severity: "MANDATORY",
    tags: ["security", "copp", "control-plane"],
  },
  {
    category: "Security, Transition & Hardware",
    name: "IPv6 uRPF (Unicast Reverse Path Forwarding)",
    description:
      "Verify IPv6 uRPF in strict and loose mode per RFC 3704. Confirm hardware drops packets with spoofed IPv6 source addresses at line rate without CPU involvement. Validate both modes do not incorrectly drop legitimate asymmetrically routed traffic.",
    rfcReference: "RFC 3704",
    severity: "MANDATORY",
    tags: ["security", "urpf", "anti-spoofing"],
  },

  // ── 5. Connectivity & Validation ─────────────────────────────────────────────
  {
    category: "Connectivity & Validation",
    name: "End-to-End Traffic Validation",
    description:
      "Perform localized and end-to-end connectivity tests in an isolated, pure-IPv6 test environment. Ensure traffic flows continuously without anomalous fragmentation or drops under load.",
    severity: "MANDATORY",
    tags: ["validation", "connectivity", "performance"],
  },
  {
    category: "Connectivity & Validation",
    name: "Log & Monitor Verification",
    description:
      "Review native IPv6 logs to verify connection states are recorded accurately. Validate that monitoring systems capturing testing metrics function seamlessly over an IPv6 management stack.",
    severity: "MANDATORY",
    tags: ["validation", "logging", "monitoring"],
  },
  {
    category: "Connectivity & Validation",
    name: "Certifications & Standards",
    description:
      "Refer to vendor-supplied release notes. Validate results against recognized benchmarks such as the USGv6 Profile or the IPv6 Ready Logo program. Document certification status.",
    severity: "RECOMMENDED",
    tags: ["validation", "compliance", "certification"],
  },

  // ── 6. MPLS & Label Switching ─────────────────────────────────────────────────
  {
    category: "MPLS & Label Switching",
    name: "6PE (IPv6 Provider Edge)",
    description:
      "Verify transport of IPv6 prefixes across an MPLS-only core using 6PE. Confirm PE routers exchange IPv6 routes via MP-BGP with IPv4-mapped next-hops and that label-switched paths correctly forward native IPv6 traffic without requiring IPv4 in the data plane.",
    rfcReference: "RFC 4798",
    severity: "MANDATORY",
    tags: ["mpls", "6pe", "label-switching", "ipv6-transport"],
  },
  {
    category: "MPLS & Label Switching",
    name: "6VPE (IPv6 VPN Provider Edge)",
    description:
      "Verify L3VPN service delivery to IPv6-only CE devices using 6VPE. Confirm VRF-aware IPv6 prefix exchange via MP-BGP, correct label stacking (VPN + transport label), and per-VRF hardware forwarding without IPv4 in the CE-to-PE data path.",
    rfcReference: "RFC 4659",
    severity: "MANDATORY",
    tags: ["mpls", "6vpe", "l3vpn", "ipv6-transport"],
  },
  {
    category: "MPLS & Label Switching",
    name: "LDPoIPv6 (LDP over IPv6)",
    description:
      "Verify that MPLS LDP sessions establish using IPv6 transport addresses exclusively. Confirm label bindings are exchanged, LIB/LFIB are correctly populated, and LSPs forward traffic correctly in an IPv4-free control and data plane.",
    rfcReference: "RFC 7552",
    severity: "RECOMMENDED",
    tags: ["mpls", "ldp", "control-plane"],
  },
  {
    category: "MPLS & Label Switching",
    name: "MPLS BFD over IPv6",
    description:
      "Verify Bidirectional Forwarding Detection for MPLS LSPs using IPv6 transport (VCCV BFD or LSP ping BFD). Confirm sub-second failure detection for label-switched paths without relying on IPv4 control adjacencies.",
    rfcReference: "RFC 5884",
    severity: "RECOMMENDED",
    tags: ["mpls", "bfd", "oam"],
  },
  {
    category: "MPLS & Label Switching",
    name: "MPLS-TE RSVP-TE over IPv6",
    description:
      "Verify RSVP-TE signaling and traffic-engineered tunnel establishment using IPv6 addressing. Confirm bandwidth reservation, CSPF path computation, and explicit route objects (ERO) operate correctly in an environment with no IPv4 IGP or transport.",
    rfcReference: "RFC 3209, RFC 4606",
    severity: "OPTIONAL",
    tags: ["mpls", "traffic-engineering", "rsvp"],
  },

  // ── 7. Segment Routing ────────────────────────────────────────────────────────
  {
    category: "Segment Routing",
    name: "SRv6 Encapsulation (H.Encaps / H.Insert)",
    description:
      "Verify the device acts as an SRv6 headend, encapsulating packets with a Segment Routing Header (SRH) using H.Encaps (outer IPv6 encapsulation) and H.Insert (SRH insertion into existing IPv6 packet) behaviors. Confirm hardware-accelerated SRH processing at line rate.",
    rfcReference: "RFC 8754",
    severity: "MANDATORY",
    tags: ["srv6", "segment-routing", "data-plane", "encapsulation"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 Endpoint Behaviors (End, End.X, End.DX6, End.DT6)",
    description:
      "Verify the device correctly processes SRv6 SIDs as a segment endpoint: End (plain SID lookup and forwarding), End.X (cross-connect to L3 adjacency), End.DX6 (decapsulation + L3 IPv6 cross-connect), and End.DT6 (decapsulation + IPv6 table lookup for L3VPN). Confirm hardware acceleration for all behaviors.",
    rfcReference: "RFC 8986",
    severity: "MANDATORY",
    tags: ["srv6", "segment-routing", "endpoint-behaviors", "data-plane"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 L3VPN (BGP-SRv6 VPN)",
    description:
      "Verify delivery of L3VPN services using SRv6 as the data plane via BGP-SRv6 VPN. Confirm advertisement of End.DT4/DT6/DT46 SIDs in BGP, per-VRF forwarding, hardware-accelerated SRv6 encapsulation and decapsulation, and correct VRF table lookup upon decapsulation.",
    rfcReference: "RFC 9252",
    severity: "MANDATORY",
    tags: ["srv6", "l3vpn", "bgp", "vpn"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 Traffic Engineering (SRv6-TE Policy)",
    description:
      "Verify SRv6 TE policy instantiation via BGP Color-Community, PCEP, or static configuration. Confirm the explicit SID stack is imposed correctly at the headend and traffic follows the engineered path end-to-end in a pure-IPv6 environment without fallback to IGP shortest path.",
    rfcReference: "RFC 9256",
    severity: "RECOMMENDED",
    tags: ["srv6", "traffic-engineering", "policy"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 IS-IS Extensions",
    description:
      "Verify IS-IS SRv6 extensions per RFC 9352: SRv6 Locator TLV advertisement, SID sub-TLVs (End, End.X, End.LAN.X), and SRv6 capability negotiation. Confirm IS-IS correctly distributes SRv6 reachability and topology information to all nodes.",
    rfcReference: "RFC 9352",
    severity: "MANDATORY",
    tags: ["srv6", "isis", "control-plane"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 OSPFv3 Extensions",
    description:
      "Verify OSPFv3 SRv6 extensions per RFC 9513: SRv6 Locator LSA advertisement, SID sub-TLVs, and capability negotiation. Confirm OSPFv3 distributes SRv6 segment information correctly and all routers can resolve SIDs to forwarding adjacencies.",
    rfcReference: "RFC 9513",
    severity: "RECOMMENDED",
    tags: ["srv6", "ospf", "control-plane"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 Micro-SID (uSID)",
    description:
      "Verify support for SRv6 Micro-SID (uSID) per RFC 9433. Confirm the device processes uSID containers correctly in hardware, advancing the active uSID pointer without CPU involvement, and that the uSID block is advertised in the control plane.",
    rfcReference: "RFC 9433",
    severity: "OPTIONAL",
    tags: ["srv6", "usid", "micro-sid", "data-plane"],
  },
  {
    category: "Segment Routing",
    name: "SRv6 OAM (Ping / Traceroute)",
    description:
      "Verify SRv6 OAM tooling per RFC 9506: SRv6 ping (echo request/reply with SRH) and SRv6 traceroute (SID stack tracing). Confirm path verification, per-SID latency measurement, and fault isolation work correctly with IPv6-only transport.",
    rfcReference: "RFC 9506",
    severity: "RECOMMENDED",
    tags: ["srv6", "oam", "troubleshooting"],
  },
  {
    category: "Segment Routing",
    name: "SR-MPLS with IPv6 Control Plane",
    description:
      "Verify Segment Routing MPLS data plane with IPv6-only control plane (IS-IS or OSPFv3 as IGP). Confirm SR node-SIDs and adjacency-SIDs are distributed via IS-IS SR (RFC 8665) or OSPFv3 SR (RFC 8666), MPLS labels are correctly allocated, and forwarding operates without any IPv4 IGP.",
    rfcReference: "RFC 8402, RFC 8665, RFC 8666",
    severity: "MANDATORY",
    tags: ["segment-routing", "mpls", "sr-mpls", "isis", "ospf"],
  },

  // ── 8. Overlay Networks & EVPN ────────────────────────────────────────────────
  {
    category: "Overlay Networks & EVPN",
    name: "VXLAN over IPv6 (VXLANv6 Unicast)",
    description:
      "Verify VXLAN encapsulation (UDP/4789) using IPv6 as the underlay transport. Confirm VTEP discovery (static or BGP EVPN), correct VNI-to-VLAN/VRF mapping, and BUM traffic handling (ingress replication or multicast) in a pure-IPv6 fabric without IPv4 transport.",
    rfcReference: "RFC 7348",
    severity: "MANDATORY",
    tags: ["vxlan", "overlay", "underlay", "data-center"],
  },
  {
    category: "Overlay Networks & EVPN",
    name: "VXLAN EVPN over IPv6",
    description:
      "Verify BGP EVPN control plane (Type-2 MAC/IP routes, Type-3 Inclusive Multicast routes) operating over an IPv6 underlay with VXLAN data plane. Confirm VTEP discovery via BGP, ARP/ND suppression, MAC/IP learning, and L2/L3 gateway functions.",
    rfcReference: "RFC 7432, RFC 8365",
    severity: "MANDATORY",
    tags: ["vxlan", "evpn", "bgp", "data-center"],
  },
  {
    category: "Overlay Networks & EVPN",
    name: "GENEVE over IPv6",
    description:
      "Verify GENEVE tunnel encapsulation (UDP/6081) over an IPv6 transport underlay. Confirm option TLV processing, correct MTU and PMTUD behavior with the additional encapsulation overhead, and hardware forwarding at line rate in pure-IPv6 environments.",
    rfcReference: "RFC 8926",
    severity: "OPTIONAL",
    tags: ["geneve", "overlay", "data-center"],
  },
  {
    category: "Overlay Networks & EVPN",
    name: "EVPN L3 Gateway (IRB) over IPv6",
    description:
      "Verify Integrated Routing and Bridging (IRB) for EVPN L3 gateway functionality over an IPv6 underlay. Confirm inter-subnet routing via a distributed anycast gateway, ARP/ND proxy suppression for hosts, and correct BGP Type-2 route advertisement with IP prefix mobility.",
    rfcReference: "RFC 9135",
    severity: "MANDATORY",
    tags: ["evpn", "irb", "l3-gateway", "routing"],
  },
  {
    category: "Overlay Networks & EVPN",
    name: "EVPN Multi-Homing (ES-LAG) over IPv6",
    description:
      "Verify EVPN Ethernet Segment (ES) multi-homing with all-active or single-active mode using an IPv6 transport underlay. Confirm Designated Forwarder (DF) election, mass MAC withdrawal on link failure, split-horizon filtering, and fast convergence without IPv4 dependency.",
    rfcReference: "RFC 7432",
    severity: "RECOMMENDED",
    tags: ["evpn", "multi-homing", "lag", "redundancy"],
  },

  // ── 9. IPv6 Multicast ─────────────────────────────────────────────────────────
  {
    category: "IPv6 Multicast",
    name: "MLDv2 (Multicast Listener Discovery v2)",
    description:
      "Verify full MLDv2 per RFC 3810: General Queries, Group-Specific Queries, Source-Specific Queries, and Listener Reports with source filtering (INCLUDE/EXCLUDE mode). Confirm hardware MLD snooping populates multicast forwarding tables at line rate without CPU flooding.",
    rfcReference: "RFC 3810",
    severity: "MANDATORY",
    tags: ["multicast", "mld", "hardware"],
  },
  {
    category: "IPv6 Multicast",
    name: "PIM-SM for IPv6",
    description:
      "Verify Protocol Independent Multicast Sparse Mode (RFC 4601) operating exclusively over IPv6. Confirm RP discovery (static, BSR, or Anycast-RP), (*,G) and (S,G) state creation, RPT-to-SPT switchover, and hardware-forwarded multicast without IPv4 control plane.",
    rfcReference: "RFC 4601",
    severity: "MANDATORY",
    tags: ["multicast", "pim", "sparse-mode"],
  },
  {
    category: "IPv6 Multicast",
    name: "PIM-SSM for IPv6",
    description:
      "Verify PIM Source-Specific Multicast (RFC 4607) for IPv6 using the ff3x::/32 prefix range. Confirm (S,G) joins are signaled exclusively via MLDv2 INCLUDE reports, forwarded without RP involvement, and hardware-accelerated at line rate.",
    rfcReference: "RFC 4607",
    severity: "RECOMMENDED",
    tags: ["multicast", "pim", "ssm", "source-specific"],
  },
  {
    category: "IPv6 Multicast",
    name: "IPv6 Multicast VPN (mVPN / NG-mVPN)",
    description:
      "Verify next-generation multicast VPN service delivery over IPv6 per RFC 6513/6514. Confirm P-tunnel establishment (mLDP P2MP or RSVP-TE), MDT join/prune signaling, correct multicast traffic isolation across VRFs, and absence of cross-VRF leakage.",
    rfcReference: "RFC 6513, RFC 6514",
    severity: "RECOMMENDED",
    tags: ["multicast", "vpn", "mvpn", "mpls"],
  },
  {
    category: "IPv6 Multicast",
    name: "mLDP (Multipoint LDP) over IPv6",
    description:
      "Verify Multipoint LDP P2MP and MP2MP tree signaling using IPv6 transport per RFC 7552. Confirm label allocation, P2MP tree construction, root/leaf node processing, and data-plane forwarding for multicast over MPLS with an exclusively IPv6 control plane.",
    rfcReference: "RFC 6388, RFC 7552",
    severity: "OPTIONAL",
    tags: ["multicast", "mpls", "mldp", "p2mp"],
  },

  // ── 10. High Availability & Resiliency ───────────────────────────────────────
  {
    category: "High Availability & Resiliency",
    name: "BFD over IPv6",
    description:
      "Verify Bidirectional Forwarding Detection session establishment using IPv6 transport per RFC 5880/5881. Confirm sub-second failure detection for BGP, OSPFv3, IS-IS, and static route adjacencies without IPv4 dependency. Validate hardware-offloaded BFD where supported.",
    rfcReference: "RFC 5880, RFC 5881",
    severity: "MANDATORY",
    tags: ["bfd", "high-availability", "failure-detection"],
  },
  {
    category: "High Availability & Resiliency",
    name: "VRRPv3 for IPv6",
    description:
      "Verify VRRPv3 first-hop redundancy for IPv6 prefixes per RFC 5798. Confirm virtual IPv6 address advertisement via RA, master/backup election using priority, preemption, and sub-second failover. Validate correct handling of link-local virtual addresses.",
    rfcReference: "RFC 5798",
    severity: "MANDATORY",
    tags: ["vrrp", "first-hop-redundancy", "high-availability"],
  },
  {
    category: "High Availability & Resiliency",
    name: "NSF / Graceful Restart for IPv6",
    description:
      "Verify Non-Stop Forwarding and Graceful Restart maintains hardware IPv6 forwarding during control-plane restarts. Confirm BGP GR (RFC 4724), OSPFv3 GR (RFC 5187), and IS-IS GR (RFC 5306) helper and restarting modes. Validate that IPv6 FIB entries are preserved across the restart window.",
    rfcReference: "RFC 4724, RFC 5187, RFC 5306",
    severity: "MANDATORY",
    tags: ["nsf", "graceful-restart", "high-availability"],
  },
  {
    category: "High Availability & Resiliency",
    name: "ECMP & Load Balancing for IPv6",
    description:
      "Verify Equal-Cost Multi-Path load balancing for IPv6 traffic in hardware. Confirm flow-based hashing using IPv6 source/destination addresses, flow label, and L4 ports. Validate all equal-cost paths are utilized without polarization across a multi-tier topology.",
    rfcReference: "RFC 2991",
    severity: "MANDATORY",
    tags: ["ecmp", "load-balancing", "forwarding"],
  },
  {
    category: "High Availability & Resiliency",
    name: "IPv6 Fast Reroute (IP-FRR / LFA)",
    description:
      "Verify IP Fast Reroute using Loop-Free Alternates (RFC 5286) or Remote-LFA for IPv6 prefixes. Confirm pre-computed backup next-hops are installed in the hardware FIB and activated within 50ms of a link or node failure, without waiting for IGP convergence.",
    rfcReference: "RFC 5286",
    severity: "RECOMMENDED",
    tags: ["frr", "lfa", "fast-reroute", "convergence"],
  },

  // ── 11. Link Security (MACsec) ───────────────────────────────────────────────
  {
    category: "Link Security (MACsec)",
    name: "MACsec Link Encryption (IEEE 802.1AE)",
    description:
      "Verify MACsec encryption and integrity protection (GCM-AES-128 or GCM-AES-256) at line rate on all relevant interfaces. Confirm that management plane traffic (SSH, SNMP, syslog) remains accessible exclusively over IPv6 while MACsec is active, and that no packets bypass the encryption boundary.",
    rfcReference: "IEEE 802.1AE",
    severity: "MANDATORY",
    tags: ["macsec", "security", "encryption", "link-layer"],
  },
  {
    category: "Link Security (MACsec)",
    name: "MKA (MACsec Key Agreement) over IPv6",
    description:
      "Verify MACsec Key Agreement Protocol (MKA per IEEE 802.1X-2020) session establishment and Secure Association Key (SAK) handshake on links with IPv6-only management. Confirm automatic key rotation, re-keying without traffic interruption, and correct CAK/CKN lifecycle management.",
    rfcReference: "IEEE 802.1X-2020",
    severity: "MANDATORY",
    tags: ["macsec", "mka", "key-management", "security"],
  },
  {
    category: "Link Security (MACsec)",
    name: "MACsec with SRv6 / VXLAN Underlay",
    description:
      "Verify MACsec interoperability when the physical link also carries SRv6 or VXLAN encapsulated traffic. Confirm MACsec is applied at the physical layer while SRv6 SRH processing and VXLAN VTEP functions operate correctly above it. Validate that no encapsulation leaks plaintext.",
    rfcReference: "IEEE 802.1AE",
    severity: "RECOMMENDED",
    tags: ["macsec", "srv6", "vxlan", "interop"],
  },

  // ── 12. Modern Management APIs & Telemetry ───────────────────────────────────
  {
    category: "Modern Management APIs & Telemetry",
    name: "NETCONF over IPv6",
    description:
      "Verify NETCONF sessions establish over SSHv2 using an IPv6 transport address. Confirm get-config, edit-config, copy-config, lock/unlock, and commit RPC operations function correctly with an IPv6-addressed manager. Validate candidate datastore and rollback-on-error capability.",
    rfcReference: "RFC 6241",
    severity: "MANDATORY",
    tags: ["netconf", "management-api", "yang"],
  },
  {
    category: "Modern Management APIs & Telemetry",
    name: "RESTCONF over IPv6",
    description:
      "Verify RESTCONF API access over HTTPS (TLS) using an IPv6-addressed client. Confirm GET, PUT, POST, PATCH, and DELETE operations on YANG-modeled data. Validate correct HTTP status codes, ETag handling, and stream notifications over IPv6.",
    rfcReference: "RFC 8040",
    severity: "MANDATORY",
    tags: ["restconf", "management-api", "yang", "https"],
  },
  {
    category: "Modern Management APIs & Telemetry",
    name: "gNMI / gRPC Streaming Telemetry over IPv6",
    description:
      "Verify gNMI (gRPC Network Management Interface) subscription and streaming telemetry sessions established over IPv6. Confirm Subscribe RPC in STREAM (on-change and sample), ONCE, and POLL modes delivers correct telemetry data to an IPv6-addressed collector without data loss or session interruption.",
    severity: "MANDATORY",
    tags: ["gnmi", "grpc", "telemetry", "streaming"],
  },
  {
    category: "Modern Management APIs & Telemetry",
    name: "OpenConfig Model Support over IPv6",
    description:
      "Verify device-side OpenConfig YANG model support accessible via NETCONF or gNMI over pure IPv6. Confirm openconfig-interfaces, openconfig-bgp, openconfig-mpls, openconfig-isis, openconfig-ospfv2, and openconfig-routing-policy models return correct operational state and accept configuration changes.",
    severity: "RECOMMENDED",
    tags: ["openconfig", "yang", "management-api"],
  },
  {
    category: "Modern Management APIs & Telemetry",
    name: "gRIBI / Programmable FIB over IPv6",
    description:
      "Verify gRIBI (gRPC RIB Interface) or equivalent programmable FIB injection API operates over IPv6 transport. Confirm IPv6 route injection, replacement, and deletion via the streaming ModifyRIB RPC without IPv4 dependency. Validate injected routes install in hardware FIB and forward traffic correctly.",
    severity: "OPTIONAL",
    tags: ["gribi", "grpc", "fib-programming", "sdn"],
  },

  // ── 13. VPN & Tunneling ───────────────────────────────────────────────────────
  {
    category: "VPN & Tunneling",
    name: "IPsec IKEv2 over IPv6",
    description:
      "Verify IKEv2 (RFC 7296) and IPsec ESP tunnel and transport mode establishment using IPv6 transport addresses. Confirm IKE_SA_INIT and IKE_AUTH exchanges, DH key agreement, SA rekeying, and Dead Peer Detection (DPD) all operate over a pure-IPv6 network without fallback to IPv4.",
    rfcReference: "RFC 7296",
    severity: "MANDATORY",
    tags: ["ipsec", "ikev2", "vpn", "security", "tunneling"],
  },
  {
    category: "VPN & Tunneling",
    name: "GRE over IPv6 (GREv6)",
    description:
      "Verify GRE tunnel encapsulation with IPv6 as the outer transport per RFC 7676. Confirm keepalive processing, correct MTU and PMTUD behavior accounting for the GRE overhead, and hardware forwarding of tunneled traffic at line rate without IPv4 dependency.",
    rfcReference: "RFC 7676",
    severity: "RECOMMENDED",
    tags: ["gre", "tunneling", "encapsulation"],
  },
  {
    category: "VPN & Tunneling",
    name: "L2TPv3 over IPv6",
    description:
      "Verify L2TPv3 pseudowire transport using IPv6 as the underlay per RFC 3931. Confirm control connection establishment, session negotiation, L2 frame forwarding (Ethernet, VLAN, HDLC), and VCCV BFD OAM over a pure-IPv6 network.",
    rfcReference: "RFC 3931",
    severity: "OPTIONAL",
    tags: ["l2tpv3", "tunneling", "pseudowire"],
  },
  {
    category: "VPN & Tunneling",
    name: "MPLS Pseudowires (LDP PW) over IPv6",
    description:
      "Verify LDP-signaled pseudowires (RFC 4447) using IPv6-only LDP transport (RFC 7552). Confirm PW label negotiation, Ethernet/VLAN pseudowire frame forwarding, VCCV ping and traceroute OAM, and BFD for pseudowire fault detection without IPv4 in the control or data plane.",
    rfcReference: "RFC 4447, RFC 7552",
    severity: "RECOMMENDED",
    tags: ["mpls", "pseudowire", "l2vpn", "ldp"],
  },
] as const;

async function main() {
  console.log(`Seeding ${TEST_CASES.length} test cases…`);
  let created = 0;
  let updated = 0;

  for (const tc of TEST_CASES) {
    const { tags, rfcReference, severity, category, name, description } = tc;
    const existing = await prisma.testCase.findUnique({
      where: { category_name: { category, name } },
    });

    await prisma.testCase.upsert({
      where: { category_name: { category, name } },
      update: {
        description,
        rfcReference: rfcReference ?? null,
        severity,
        tags: JSON.stringify(tags),
      },
      create: {
        category,
        name,
        description,
        rfcReference: rfcReference ?? null,
        severity,
        tags: JSON.stringify(tags),
      },
    });

    if (existing) updated++;
    else created++;
  }

  const total = await prisma.testCase.count();
  console.log(`Done. ${created} created, ${updated} updated — ${total} total test cases in DB.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
