/**
 * Keyword map for cross-referencing config file content against compliance test cases.
 * Keys must match test case names exactly as seeded in scripts/seed.ts.
 */
export const TEST_CASE_KEYWORDS: Record<string, string[]> = {
  // Network Management & Telemetry
  "SSH (SSHv2)": [
    "ssh", "sshv2", "ip ssh", "crypto key", "aaa authentication ssh",
    "line vty", "transport input ssh",
  ],
  "Telnet": [
    "telnet", "transport input telnet", "no telnet", "service telnet",
    "no service telnet", "transport input none",
  ],
  "RADIUS": [
    "radius", "radius-server", "aaa group server radius", "radius server",
    "authentication radius",
  ],
  "TACACS+": [
    "tacacs", "tacacs+", "tacacs-server", "aaa group server tacacs",
    "authentication tacacs",
  ],
  "Syslog": [
    "logging", "syslog", "log host", "logging host", "logging facility",
    "logging trap", "logging severity",
  ],
  "SNMP": [
    "snmp", "snmpv3", "snmp-server", "snmp community", "snmp host",
    "snmp trap", "snmp user", "snmp group",
  ],
  "NetFlow / IPFIX / sFlow": [
    "netflow", "ipfix", "sflow", "flow exporter", "flow monitor",
    "flow record", "sampled-netflow", "ip flow", "ipv6 flow",
  ],
  "NTP": [
    "ntp", "ntp server", "ntp peer", "clock timezone", "clock summer-time",
    "ntp source", "ntp authenticate",
  ],
  "DNS": [
    "dns", "name-server", "ip name-server", "ipv6 name-server",
    "domain name", "ip domain", "resolver",
  ],

  // Core IPv6 Protocols & Features
  "ICMPv6 & Neighbor Discovery": [
    "icmpv6", "ipv6 nd", "nd prefix", "nd ra", "router-advertisement",
    "ipv6 neighbor", "neighbor discovery", "nd suppress-ra",
    "ipv6 icmp error-interval",
  ],
  "Addressing & SLAAC / DHCPv6": [
    "ipv6 address", "ipv6 dhcp", "dhcpv6", "slaac", "autoconfig",
    "ipv6 address autoconfig", "ipv6 dhcp pool", "ipv6 dhcp relay",
    "prefix-delegation", "ipv6 enable",
  ],
  "DHCPv6 Relay": [
    "ipv6 dhcp relay", "dhcpv6 relay", "helper-address", "dhcp relay",
    "relay-agent", "ipv6 helper", "relay destination", "relay forward",
    "interface-id", "remote-id",
  ],
  "DHCPv6 Prefix Delegation Relay (DHCPv6-PD)": [
    "prefix-delegation", "ia_pd", "ia-pd", "ipv6 dhcp relay",
    "delegating-router", "requesting-router", "ipv6 dhcp pool",
    "prefix hint", "dhcpv6 pd", "pd relay",
  ],
  "Router Advertisement Suppression": [
    "nd suppress-ra", "no ipv6 nd ra suppress", "suppress-ra",
    "ipv6 nd suppress-ra", "no ra", "ipv6 nd prefix", "router-advertisement",
    "nd ra-interval", "ipv6 nd managed-config-flag",
  ],
  "Router Advertisement Options (RDNSS, DNSSL, Route Information)": [
    "ipv6 nd dns-server", "ipv6 nd dns search-list", "rdnss", "dnssl",
    "nd dns", "ipv6 nd prefix", "route-information", "nd route-info",
    "ipv6 nd ra dns", "nd ra-lifetime",
  ],
  "RFC 8781 PREF64 RA Option": [
    "pref64", "nat64 prefix", "ipv6 nat64", "nd prefix", "ra option",
    "pref64-option", "nat64-prefix-ra", "ipv6 nd pref64",
  ],

  // IPv6 Routing & Forwarding
  "RIPng": [
    "ripng", "rip ng", "ipv6 rip", "router rip", "redistribute ripng",
  ],
  "OSPFv3": [
    "ospfv3", "ospf3", "ipv6 ospf", "router ospfv3", "area ospf",
    "ospf process", "ipv6 router ospf",
  ],
  "IS-IS (IPv6 Address Family)": [
    "isis", "is-is", "ipv6 router isis", "router isis", "address-family ipv6",
    "multi-topology", "ipv6 metric",
  ],
  "MP-BGP": [
    "bgp", "neighbor", "address-family ipv6", "ipv6 unicast",
    "bgp router-id", "route-reflector", "neighbor activate",
    "redistribute bgp",
  ],
  "IPv4 NLRI with IPv6 Next Hop (RFC 8950)": [
    "ipv6 next-hop", "next-hop ipv6", "address-family ipv4",
    "ipv4 unicast ipv6", "extended-nexthop", "extended nexthop",
    "ipv4 reachability", "neighbor capability", "nexthop-encoding",
    "route-map set ipv6 next-hop", "ipv4 nlri",
  ],

  // Security, Transition & Hardware
  "IPv6 ACLs & First-Hop Security": [
    "ipv6 access-list", "ipv6 acl", "ipv6 traffic-filter",
    "ipv6 inspect", "ra-guard", "dhcp-guard", "ipv6 snooping",
    "binding table", "source-guard", "nd inspection",
  ],
  "Simultaneous IPv4 and IPv6 ACL Enforcement": [
    "ip access-list", "ipv6 access-list", "ip access-group",
    "ipv6 traffic-filter", "access-group", "access-class",
    "tcam", "hardware access-list",
  ],
  "IPv6 ACL Ingress and Egress Direction Restrictions": [
    "ipv6 traffic-filter", "ipv6 access-list", "access-group",
    "in", "out", "egress", "ingress", "direction",
    "ipv6 acl out", "ipv6 traffic-filter out",
  ],
  "Hardware / ASIC Datapath": [
    "ipv6 cef", "ipv6 forwarding", "hardware ipv6", "asic", "tcam",
    "ipv6 route-cache", "sdm prefer", "ipv6 unicast-routing",
  ],
  "IPv6 Transition Mechanisms": [
    "tunnel", "6to4", "isatap", "6rd", "nat64", "map-e", "lw4over6",
    "ipv6 tunnel", "tunnel mode ipv6ip", "ipv6ip", "ipip6",
  ],

  // Connectivity & Validation
  "End-to-End Traffic Validation": [
    "ping ipv6", "traceroute ipv6", "ipv6 ping", "test ipv6",
    "ipv6 reachability",
  ],
  "Log & Monitor Verification": [
    "logging", "monitor", "debug ipv6", "show ipv6", "accounting",
    "event-monitor", "ipv6 traffic",
  ],
  "Certifications & Standards": [
    "usgv6", "ipv6-ready", "ripe", "arin", "ietf", "rfc", "compliance",
    "certification",
  ],
};

/**
 * Returns line numbers (1-based) in `content` that contain at least one keyword
 * for the given test case name.
 */
export function findMatchingLines(
  content: string,
  testCaseName: string
): number[] {
  const keywords = TEST_CASE_KEYWORDS[testCaseName];
  if (!keywords || keywords.length === 0) return [];

  const pattern = new RegExp(
    keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "i"
  );

  const lines = content.split("\n");
  const matches: number[] = [];
  lines.forEach((line, i) => {
    if (pattern.test(line)) matches.push(i + 1);
  });
  return matches;
}
