# Cloud Networking Architecture

This section details the explicit Google Cloud networking resources mapped together to support the microservices ecosystem. 

Rather than deploying components into a single, flat Virtual Private Cloud (VPC), this system enforces strict network segregation. The goal is to isolate manufacturer domains from consumer domains, eliminating vast attack surfaces and lateral movement capabilities inherent in unconstrained VPC Peering or broad subnet addressing.

---

## 1. Edge Ingress and Load Balancing

Before traffic intersects with internal container infrastructure, it must negotiate the public perimeter securely.

### Global External Application Load Balancer
Public client requests ingress exclusively through a [Global External Application Load Balancer](https://cloud.google.com/load-balancing/docs/application), functioning as an HTTP/HTTPS reverse proxy.
*   **Implementation**: It physically terminates client TCP handshakes and TLS encryption directly at the Google edge point-of-presence (PoP) nearest the requestor, rather than forcing backhaul to the underlying origin servers.
*   **Security (Cloud Armor)**: Before processing HTTP paths, traffic traverses a rigorous inspection via [Google Cloud Armor](https://cloud.google.com/armor/docs/cloud-armor-overview). Cloud Armor provides real-time layer-7 deep-packet inspection evaluating custom Web Application Firewall (WAF) rule sets to mitigate volumetric and application-layer DDoS attacks automatically holding malicious requests before they consume compute resources.
*   **VPC Routing**: Legitimate, sanitized traffic routes intrinsically to the `checkoutservice` GKE nodes traversing Google's zero-trust underlying fiber backbone via Serverless Network Endpoint Groups (NEGs), shielding backend IPs from public internet accessibility.

---

## 2. Cross-VPC Connectivity

When the `checkoutservice` GKE cluster attempts to synchronize domain states with highly isolated internal application environments (e.g. the Inventory databases), it must route packets securely across explicitly decoupled VPCs.

### 2.1 Private Service Connect (PSC)
**Scenario:** `checkoutservice` (GKE) → `Inventory Service` (Compute VM)

The `inventory-vpc` is structurally sealed: no internet ingress, no public IPs, and zero established peering boundaries mapped to external VPCs natively.
*   **The Design**: The Inventory domain acts as a service provider, publishing their application layer utilizing a **PSC Service Attachment** placed securely behind an internal TCP load balancer. The GKE consumer team provisions a mapped **PSC Endpoint** entirely inside their distinct `online-boutique-vpc`. 
*   **Application**: PSC establishes a strictly focused, one-way network tunnel connecting strictly to that singular port mapping. If the originating GKE cluster suffers a catastrophic theoretical compromise, attackers lack the routing capability required to ping or scan the Inventory VPC’s `/24` subnet masking natively. By explicitly eliminating overlapping CIDR subnet calculations required by traditional VPC Peering formats, PSC prevents massive lateral IP-level infiltration dynamically without altering any internal BGP routing mechanisms.
*   [Review PSC Documentation](https://cloud.google.com/vpc/docs/private-service-connect)

### 2.2 Internal TCP Load Balancing (ILB)
**Scenario:** `checkoutservice` (GKE) → `CRM Service` (Compute VM)

Legacy instances unmanaged by Kubernetes necessitate discrete, robust high-availability controls manually.
*   **The Design**: Monolithic operations executing directly utilizing unmanaged Compute Engine instances natively sit behind a dedicated **regional Internal Load Balancer**. 
*   **Application**: Consumer routing points exclusively to a stateless virtual IP (VIP) (such as `10.3.0.xxx`). The ILB autonomously performs rigid TCP health checking, detecting localized unresponsiveness and rerouting consumer connections silently utilizing purely internal underlying software-defined network (SDN) configurations mapped across localized subnets dynamically without manual DNS failover interactions.
*   [Review ILB Documentation](https://cloud.google.com/load-balancing/docs/internal)

### 2.3 Cloud DNS (Private Zones Structure)
**Scenario:** Global Microservice IP Resolution

Hardcoding raw IPv4 mappings directly inside microservice configuration files creates exceptionally brittle deployment pipelines during infrastructure scale-out events.
*   **The Design**: This architecture implements a robust, centralized managed **Cloud DNS private zone** (`internal.boutique.local`). By structuring internal DNS mapping utilizing explicit Private Visibility parameters, this logical zone propagates reliable A-Record resolutions simultaneously mapping to the decoupled `crm-vpc`, `inventory-vpc`, and the `online-boutique-vpc` without spanning routing capabilities inherently.
*   **Application**: A container internally queries `http://inventory.internal.boutique.local:8080/health`. DNS dynamically maps this fully qualified domain name exclusively resolving the exact PSC IP endpoint associated dynamically beneath the routing layer. 
*   [Review Cloud DNS Documentation](https://cloud.google.com/dns/docs/zones)

---

## 3. Serverless VPC Inter-Networking 

Serverless Cloud Run environments inherently boot inside isolated Google-managed tenant organizations located fundamentally outside of customized user-defined VPC addressing networks standardly. Bridging these managed processes backward cleanly into localized, private RFC-1918 structured address spaces dictates explicit egress methodologies.

### 3.1 Direct VPC Egress
**Scenario:** `Warehouse Service` (Cloud Run) → `Inventory Service` (Private VM)

*   **The Design**: The modern execution standard. As a Cloud Run instance dynamically scales out, its secondary virtual network interface natively binds an explicitly delegated network interface strictly onto a designated `/28` subnet dynamically carved out within the target isolated `inventory-vpc` explicitly via **Direct VPC Egress**.
*   **Application**: Egress traffic drops directly down Google's internal software-defined fabrics straight toward the destination mapping. By circumventing intermediate physical proxy appliances, it significantly accelerates base throughput, completely limits latency tail spikes traditionally induced by intermediate proxy appliances intrinsically handling dynamic data loads during scale-out operations.
*   [Review Direct VPC Egress Documentation](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)

### 3.2 Serverless VPC Access Connectors
**Scenario:** `Accounting Service` (Cloud Run) → `CRM Service` (Private VM)

*   **The Design**: A legacy architectural approach explicitly maintaining backward-compatible connectivity. The Accounting Service actively routes traffic structurally into an isolated secondary tunnel traversing autonomously an actively managed Virtual Machine cluster called a **VPC Access Connector** logically provisioned directly inside the physical boundaries of the objective network.
*   **Application**: These intermediate physical connectors actively ingest bandwidth directly and are intrinsically subjected dynamically to internal routing thresholds. During rapid cold-start conditions, packets traversing the connector exhibit physically identifiable processing latency overhead when scaling outward dynamically but remain structurally imperative bridging specialized IP translations traditionally.
*   [Review VPC Access Connectors Documentation](https://cloud.google.com/vpc/docs/serverless-vpc-access)

---

## 4. Google API Inter-Tunnels

### 4.1 Private Google Access (PGA)
**Scenario:** `Cloud Run Node` → `Cloud Pub/Sub API`

Secure nodes executing exclusively within closed VPC topologies actively prevent routing directly crossing egress NAT appliances onto public IP registries entirely.
*   **The Design**: Rather than inherently discarding internal packet routes explicitly querying public REST API destinations (e.g. `pubsub.googleapis.com`), activating **Private Google Access (PGA)** exclusively redirects the underlying DNS resolution natively toward explicit private-internal API resolution maps strictly located internal to the regional fabric completely autonomously. 
*   **Application**: Internal traffic explicitly bends across direct local inter-datacenter loops natively mapped transparently across internal Google API proxies instead of actively deviating outwardly bypassing generalized public internet routes simultaneously guaranteeing total routing privacy traversing restricted configurations flawlessly.
*   [Review Private Google Access Documentation](https://cloud.google.com/vpc/docs/private-google-access)
