# Comprehensive IPv6 Compliance Checklist
*A superset checklist for testing and validating IPv6 compliance in network hardware.*

## 1. Network Management & Telemetry Protocols
This section focuses exclusively on the protocols used to manage, securely access, monitor, and log the state of the network device over a native IPv6 transport. Management protocols should never be conflated with the routing plane.

*   **Remote Access & Execution:**
    *   **Secure Shell (SSH):** Verify support for incoming and outgoing SSHv2 CLI sessions over an IPv6 transport natively.
    *   **Telnet:** (If required for legacy testing) Verify support for Telnet over IPv6. Strongly discouraged in production environments.
*   **Authentication, Authorization, and Accounting (AAA):**
    *   **RADIUS:** Verify the device can encapsulate AAA requests and properly communicate with RADIUS servers over purely IPv6 networks.
    *   **TACACS+:** Ensure TACACS+ server communication and policy enforcement is fully supported over native IPv6.
*   **Logging and Telemetry:**
    *   **Syslog:** Verify the device supports sending system log messages natively to an IPv6-addressed remote Syslog server.
    *   **SNMP:** Verify full support for SNMPv2c and SNMPv3 polling, traps, and informs over an IPv6 transport.
    *   **NetFlow / IPFIX / sFlow:** Ensure the device can efficiently export flow records representing both IPv4 and IPv6 traffic directly to an IPv6-addressed flow collector.
*   **Core Foundation Services:**
    *   **NTP:** Verify time synchronization with IPv6-addressed Network Time Protocol servers.
    *   **DNS:** Support for standard DNS queries sourced from an IPv6 address, resolving both A and AAAA records.

## 2. Core IPv6 Protocols & Features
*   **ICMPv6 and Neighbor Discovery (ND):**
    *   Verify ICMPv6 Echo Request (ECHO REQ) and Echo Reply (ECHO REPLY) via standard tools like ping.
    *   Confirm ICMPv6 ND processes function: Router Solicitations (RS), Router Advertisements (RA), Neighbor Solicitations (NS), and Neighbor Advertisements (NA).
*   **Addressing and Interfaces:**
    *   Verify the correct generation, application, and lifetime tracking of IPv6 Global Unicast Addresses (GUA) and Link-Local Addresses.
    *   Confirm stateless address autoconfiguration (SLAAC) and/or stateful DHCPv6 processing.

## 3. IPv6 Routing & Forwarding Protocols
*   **Routing Information Protocol next generation (RIPng):**
    *   Ensure RIPng builds neighbor adjacencies properly via link-local IPv6 addresses.
    *   Verify routing table entries, updates, and metrics are functioning.
*   **Open Shortest Path First (OSPFv3):**
    *   Verify OSPFv3 neighbour adjacencies establish correctly on required link-local interfaces.
    *   Confirm OSPFv3 routes (intra-area, inter-area, and external) are accurately calculated and inserted into the routing table.
*   **Intermediate System to Intermediate System (IS-IS):**
    *   Verify that IPv6 address families are correctly configured and successfully routed via the IS-IS topology.
*   **Multiprotocol BGP (MP-BGP):**
    *   Verify BGP peerings (eBGP and iBGP) establish over IPv6 TCP transport.
    *   Confirm exchange of IPv6 Network Layer Reachability Information (NLRI).

## 4. Security, Transition, and Hardware Support
*   **Device Security:**
    *   Verify hardware support for robust IPv6 Access Control Lists (ACLs) processed at line-rate.
    *   Check for First-Hop Security capabilities including RA Guard, ND Inspection, and DHCPv6 Guard.
*   **Hardware / Datapath Handling:**
    *   Ensure hardware natively forwards IPv6 traffic in ASIC/datapath rather than punting to the CPU.
    *   Evaluate IPv6 hardware multicast capabilities (e.g., MLDv1/MLDv2 snooping).
*   **IPv6 Transition Mechanisms:**
    *   Where explicitly required, test Dual-stack capabilities as well as transition overlays like NAT64/DNS64, or IP-in-IP GRE tunnelling.

## 5. Connectivity & Test Validation Procedures
*   **Traffic Validation:**
    *   Perform localized and end-to-end connectivity tests in an isolated, pure-IPv6 test environment. Ensure traffic flows continuously without anomalous fragmentation or drops.
*   **Log and Monitor Verification:**
    *   Review native IPv6 logs to verify connection states are recorded accurately.
    *   Validate monitoring systems that capture the testing metrics function seamlessly over an IPv6 management stack.
*   **Certifications & Standards:**
    *   Refer to vendor-supplied release notes. Validate results against recognized benchmarks (e.g., USGv6 Profile or the IPv6 Ready Logo program).