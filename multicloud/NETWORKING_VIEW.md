# Multi-Cloud & Hybrid Networking Architecture (Networking View)

The primary goal of this demonstration project is to showcase maximum diversity in Google Cloud Platform networking topologies. This document breaks down exactly how different components communicate, the networking technologies utilized, and why specific patterns were chosen over traditional VPC Peering.

---

## 1. Core Ingress Networking
**Component:** API Gateway & GKE Cluster (`checkoutservice`)
**Technology:** Google Cloud External Application Load Balancer & Cloud Armor
*   **Design Profile**: All public traffic ingress (users placing orders) routes exclusively through a Global External HTTP(S) Load Balancer configured with Google Cloud Armor for automated DDoS protection and WAF (Web Application Firewall). 
*   **Rationale**: Traffic terminates at Google's global edge network rather than the region. The proxy forwards traffic directly to GKE nodes via Serverless NEGs (Network Endpoint Groups).

## 2. Service-to-Service Networking (VPCs)

### 2.1 Private Service Connect (PSC)
**Component & Target:** `checkoutservice` (GKE) $\rightarrow$ Inventory Service (GCP VM)
*   **Design Profile**: The `inventory-vpc` is strictly isolated without public ingress or peering routes. The connection relies purely on PSC, publishing the Inventory API as an internal IP address inside the client's VPC using a Service Attachment and Forwarding Rule.
*   **Rationale**: Maximum security via Consumer/Producer separation. It prevents accidental lateral network movement because consumers only see the explicitly published API endpoint, unlike VPC Peering which exposes entire subnets.

### 2.2 Internal TCP Load Balancing (ILB)
**Component & Target:** `checkoutservice` (GKE) $\rightarrow$ CRM Service (GCP VM)
*   **Design Profile**: Traffic to the legacy CRM mono-repo passes through an unmanaged instance group concealed behind a regional Internal Load Balancer serving on `10.3.0.xxx:8080`.
*   **Rationale**: Distributes stateless logic across legacy VM instances transparently to modern microservices, acting as a highly available internal facade. 

### 2.3 HA Cloud VPN
**Component & Target:** `checkoutservice` (GKE) $\rightarrow$ Furniture Service (GCP VM)
*   **Design Profile**: A highly available IPsec VPN tunnel connecting the boutique GKE clusters network with the furniture's dedicated backend VPC.
*   **Rationale**: Allows secure, encrypted connectivity between isolated VPCs using BGP routing over public IP infrastructure. This showcases how hybrid legacy systems that cannot use VPC Peering or PSC might still connect natively with high SLAs.

---

## 3. Serverless Networking (Cloud Run)

Modern serverless compute naturally boots outside of user-defined VPCs. We demonstrate two opposing methods of pushing Serverless traffic *backward* into private RFC-1918 locked subnets.

### 3.1 Direct VPC Egress
**Component & Target:** Warehouse Service (Cloud Run) $\rightarrow$ Inventory Service (GCP VM)
*   **Design Profile**: The Warehouse Cloud Run container is natively attached directly to a `/28` internal subnet within the target's VPC using Direct VPC Egress.
*   **Rationale**: The modern standard for Serverless networking passing entirely over Google's backbone bypassing middlebox bottlenecks. 

### 3.2 Serverless VPC Access Connectors
**Component & Target:** Accounting Service (Cloud Run) $\rightarrow$ CRM Service (GCP VM)
*   **Design Profile**: The Accounting Service routes its private traffic through a dedicated, managed VM "Connector" bridge deployed inside the target CRM network.
*   **Rationale**: Displays the older, legacy method of serverless connectivity. High scale introduces bottlenecking and cold starts at the connector layer, showcasing why Direct VPC Egress is superior for high-throughput microservices.

### 3.3 Serverless Service Integration / Public API Exposure
**Component & Target:** Apigee Gateway $\rightarrow$ Partner API Service (Cloud Run)
*   **Design Profile**: The Partner API application sits entirely isolated with `Ingress: internal` preventing any direct external connections. Apigee connects strictly via a reverse-proxy Serverless NEG bridging the public endpoint to the private VPC without exposing the backend service native URL.
*   **Rationale**: By restricting ingress, the B2B application drops any packet not strictly originating from the VPC or managed Google APIs. Apigee sits at the public network border parsing third-party JWT tokens, validating developer API keys, and enforcing partner quotas before proxying authorized traffic securely over the internal backbone.

---

## 4. Asynchronous & Multi-Cloud Networking

### 4.1 Private Google Access (PGA)
**Component & Target:** GKE / Cloud Run $\rightarrow$ Event Broker (Cloud Pub/Sub)
*   **Design Profile**: Microservices do not require NAT Gateways or public IPs to reach Google Managed APIs (like Pub/Sub or Cloud Storage). PGA inherently routes requests specifically terminating at `*.googleapis.com` through Google's internal backbone, completely avoiding the internet protocol.

### 4.2 VPC Service Controls (VPC SC)
**Component & Target:** Event Broker $\rightarrow$ Data Warehouse (BigQuery)
*   **Design Profile**: Prevents Data Exfiltration by placing a hardened security perimeter around the BigQuery APIs.
*   **Rationale**: Even if a developer accidentally exposes credentials, queries against the Data Warehouse will bounce heavily at the perimeter layer unless originating directly from within an approved interior VPC namespace.

### 4.3 Dedicated / Carrier Interconnect
**Component & Target:** ERP Systems (GCP GCP) $\rightarrow$ Fraud Detection Engine (Azure VM)
*   **Design Profile**: Cross-cloud telemetry streaming routes through a fully managed Dedicated Interconnect or Carrier Interconnect, providing physical link aggregation directly into Azure.
*   **Rationale**: Enterprise cross-cloud multi-vendor traffic requires BGP secured tunneling over dedicated physical bandwidth so that `10.x.x.x` (GCP) can natively ping `10.y.y.y` (Azure Virtual Network subnets) securely, bypassing internet routing and unpredictable latency entirely.
