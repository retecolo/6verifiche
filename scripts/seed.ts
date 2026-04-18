import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const TEST_CASES = [
  // 1. Network Management & Telemetry
  {
    category: "Network Management & Telemetry",
    name: "SSH (SSHv2)",
    description:
      "Verify support for incoming and outgoing SSHv2 CLI sessions over an IPv6 transport natively, using both link-local and Global Unicast Addresses.",
  },
  {
    category: "Network Management & Telemetry",
    name: "Telnet",
    description:
      "(Legacy) Verify support for Telnet over IPv6. Strongly discouraged in production environments; test only when explicitly required for legacy compatibility.",
  },
  {
    category: "Network Management & Telemetry",
    name: "RADIUS",
    description:
      "Verify the device can encapsulate AAA requests and properly communicate with RADIUS servers over purely IPv6 networks.",
  },
  {
    category: "Network Management & Telemetry",
    name: "TACACS+",
    description:
      "Ensure TACACS+ server communication and policy enforcement (authentication, authorization, and accounting) is fully supported over native IPv6.",
  },
  {
    category: "Network Management & Telemetry",
    name: "Syslog",
    description:
      "Verify the device supports sending system log messages natively to an IPv6-addressed remote Syslog server over UDP/TCP.",
  },
  {
    category: "Network Management & Telemetry",
    name: "SNMP",
    description:
      "Verify full support for SNMPv2c and SNMPv3 polling, traps, and informs over an IPv6 transport. Confirm MIB object accessibility via IPv6-addressed manager.",
  },
  {
    category: "Network Management & Telemetry",
    name: "NetFlow / IPFIX / sFlow",
    description:
      "Ensure the device can efficiently export flow records representing both IPv4 and IPv6 traffic directly to an IPv6-addressed flow collector.",
  },
  {
    category: "Network Management & Telemetry",
    name: "NTP",
    description:
      "Verify time synchronization with IPv6-addressed Network Time Protocol servers. Confirm NTPv4 operation over IPv6 transport.",
  },
  {
    category: "Network Management & Telemetry",
    name: "DNS",
    description:
      "Support for standard DNS queries sourced from an IPv6 address, resolving both A and AAAA records. Confirm recursive and iterative query support.",
  },

  // 2. Core IPv6 Protocols & Features
  {
    category: "Core IPv6 Protocols & Features",
    name: "ICMPv6 & Neighbor Discovery",
    description:
      "Verify ICMPv6 Echo Request and Echo Reply via ping. Confirm ICMPv6 ND processes: Router Solicitations (RS), Router Advertisements (RA), Neighbor Solicitations (NS), and Neighbor Advertisements (NA).",
  },
  {
    category: "Core IPv6 Protocols & Features",
    name: "Addressing & SLAAC / DHCPv6",
    description:
      "Verify correct generation, application, and lifetime tracking of IPv6 Global Unicast Addresses (GUA) and Link-Local Addresses. Confirm stateless address autoconfiguration (SLAAC) and/or stateful DHCPv6 processing.",
  },

  // 3. IPv6 Routing & Forwarding
  {
    category: "IPv6 Routing & Forwarding",
    name: "RIPng",
    description:
      "Ensure RIPng builds neighbor adjacencies properly via link-local IPv6 addresses. Verify routing table entries, updates, and metrics are functioning correctly.",
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "OSPFv3",
    description:
      "Verify OSPFv3 neighbour adjacencies establish correctly on required link-local interfaces. Confirm OSPFv3 routes (intra-area, inter-area, and external) are accurately calculated and inserted into the routing table.",
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "IS-IS (IPv6 Address Family)",
    description:
      "Verify that IPv6 address families are correctly configured and successfully routed via the IS-IS topology. Confirm IPv6 prefixes are exchanged and installed.",
  },
  {
    category: "IPv6 Routing & Forwarding",
    name: "MP-BGP",
    description:
      "Verify BGP peerings (eBGP and iBGP) establish over IPv6 TCP transport. Confirm exchange of IPv6 Network Layer Reachability Information (NLRI) via the IPv6 address family.",
  },

  // 4. Security, Transition & Hardware
  {
    category: "Security, Transition & Hardware",
    name: "IPv6 ACLs & First-Hop Security",
    description:
      "Verify hardware support for robust IPv6 Access Control Lists (ACLs) processed at line-rate. Check for First-Hop Security capabilities including RA Guard, ND Inspection, and DHCPv6 Guard.",
  },
  {
    category: "Security, Transition & Hardware",
    name: "Hardware / ASIC Datapath",
    description:
      "Ensure hardware natively forwards IPv6 traffic in ASIC/datapath rather than punting to the CPU. Evaluate IPv6 hardware multicast capabilities (e.g., MLDv1/MLDv2 snooping).",
  },
  {
    category: "Security, Transition & Hardware",
    name: "IPv6 Transition Mechanisms",
    description:
      "Where explicitly required, test dual-stack capabilities and transition overlays such as NAT64/DNS64 or IP-in-IP GRE tunnelling. Document which mechanisms are supported in hardware vs. software.",
  },

  // 5. Connectivity & Validation
  {
    category: "Connectivity & Validation",
    name: "End-to-End Traffic Validation",
    description:
      "Perform localized and end-to-end connectivity tests in an isolated, pure-IPv6 test environment. Ensure traffic flows continuously without anomalous fragmentation or drops under load.",
  },
  {
    category: "Connectivity & Validation",
    name: "Log & Monitor Verification",
    description:
      "Review native IPv6 logs to verify connection states are recorded accurately. Validate that monitoring systems capturing testing metrics function seamlessly over an IPv6 management stack.",
  },
  {
    category: "Connectivity & Validation",
    name: "Certifications & Standards",
    description:
      "Refer to vendor-supplied release notes. Validate results against recognized benchmarks such as the USGv6 Profile or the IPv6 Ready Logo program. Document certification status.",
  },
] as const;

async function main() {
  console.log(`Seeding ${TEST_CASES.length} test cases…`);
  let created = 0;
  let updated = 0;

  for (const tc of TEST_CASES) {
    const result = await prisma.testCase.upsert({
      where: { category_name: { category: tc.category, name: tc.name } },
      update: { description: tc.description },
      create: tc,
    });
    if (result.description === tc.description) updated++;
    else created++;
  }

  const total = await prisma.testCase.count();
  console.log(`Done. ${TEST_CASES.length} upserted — ${total} total test cases in DB.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
