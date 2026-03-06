# Infrastructure & Operations

This section outlines the physical multi-region deployment map across Google Cloud and Microsoft Azure, and specifically details the underlying Infrastructure as Code (IaC) modularity utilizing Terraform to orchestrate the environment automatically.

By distributing resources globally, the architecture simulates realistic physical latency and cross-regional routing boundaries mandated by expansive enterprise operations protocols securely.

---

## 1. Network Observability

Detailed visibility into cross-cloud traffic flows is essential for maintaining enterprise operational baselines. We leverage Google Cloud's extensive logging and partner solutions to monitor packet health securely.

### Cloud Network Insights (AppNeta / Broadcom Preview)
This environment serves as a testbed for **Cloud Network Insights**—a collaborative preview product between AppNeta (Broadcom) and Google Cloud. The deployment features:
*   **Target Monitoring Points**: A dedicated `monitoring-point-hybrid-vpc` Compute Engine VM sits inside the transit network (`hybrid-vpc`). This acts as the host-mode software container for the agent.
*   **Custom Firewall Configurations**: To successfully operate the monitoring daemon and validate global routes, the `hybrid-vpc` rigidly enforces granular ingress points. It accepts all standard tracing telemetry (IPv4 ICMP/Echo) and opens precise TCP ports (`443, 3236, 3238`) and UDP ports (`7, 1720, 3236-3239, 5060, 33434, 49150`) allowing the agent to continuously build exact cross-cloud latency topologies natively.

---

## 2. Advanced Multi-Cloud Connectivity (Hub & Spoke)

Deploying identical demo iterations rapidly inherently yields massive IP conflict risks locally when peering directly with central enterprise backbones.

### The IP Overlap Challenge
The project orchestrates multiple ephemeral `online-boutique-vpc` environments dynamically, consistently re-using the `10.128.0.0/20` subnet aggressively to maintain Terraform homogeneity. However, a single central shared network (the *Hub*, hosting the Azure Interconnect in `location-verification`) cannot functionally peer with multiple identically addressed networks simultaneously because BGP routing maps critically collide.

### The Transit Architecture & PSC Bridge
1. **The Transit Router (`hybrid-vpc`)**: Instead of peering the demo natively, a centralized pipeline (`hybrid-vpc`) operates as the sole peered bridge to the Interconnect Hub actively. It utilizes a tiny, completely distinct disjointed IP class (`10.250.0.0/24`).
2. **Serverless Private Service Connect (PSC)**: Because GCP limits non-transitive VPC peering from organically forwarding traffic directly onward into Azure, we implement advanced L4 Private Service Connect endpoints directly.
    * An Internal TCP Proxy Load Balancer sits securely inside `hybrid-vpc` backing a Hybrid Network Endpoint Group (NEG) tied specifically to the proprietary Azure VM IP (`10.2.1.5`).
    * The L4 Proxy publishes itself as a Service Attachment leveraging explicit internal NAT processing completely masking and segregating the `10.128` demo overlap automatically preventing upstream route disruption.
    * The primary `online-boutique-vpc` connects actively utilizing two localized private IPs mapped seamlessly to this attachment. HTTP legacy workloads target `10.128.0.50` (port `80`) and alternative pipelines securely request `10.128.0.51` executing proxy transitions perfectly aligned to Azure's port `8080`.

---

## 3. Multi-Regional Deployment Topology

To ensure strict network boundaries and to study high-latency structural conditions authentically, backend and API processes execute in disparate geographical zones.

### Google Cloud Regions

*   **`us-central1` (Iowa)**: The Core Compute Zone.
    *   Houses the primary GKE cluster (`online-boutique-cluster`), executing the entire synchronous storefront checkout process actively.
    *   Hosts the Vertex AI Agent Engine (`crm-concierge`), utilizing the Google Agent Development Kit (ADK) parameters.
    *   Deploys the out-of-band Traffic Collector engines. Distributed actively via Internal Load Balancing arrays (`oob-collector-ilb`, `oob-collector-ilb-a`, `oob-collector-ilb-b`, `oob-collector-ilb-c`) collecting regional traffic intercepting flows across Availability Zones concurrently.
    *   Executes the serverless Accounting Service (Cloud Run), bound by localized Serverless VPC Access Connectors routing financial data natively.
    *   Manages the specialized Furniture Service legacy VMs, communicating across strict HA Cloud VPN boundaries specifically for localized freight tracking.

*   **`asia-east1` (Taiwan)**: The Customer Profile Operations.
    *   Contains the monolithic CRM Service VMs mapped rigorously behind a regional Internal Load Balancer linking natively strictly to Cloud SQL replication environments securely spanning geographic regions.

*   **`europe-west1` (Belgium)**: The Primary Logistics Operations.
    *   Hosts the Inventory Service legacy compute workloads actively. This core module manages extremely high-frequency physical stock capacities mapped and published securely to the `us-central1` GKE cluster natively by Private Service Connect (PSC).
    *   Deploys the Warehouse Service Serverless Cloud Run integration communicating directly to the Inventory VMs solely via Direct VPC Egress native binding structures dynamically.

*   **`australia-southeast1` (Sydney)**: The Core Orchestration Operations.
    *   Executes the foundational Order Management System (Cloud Run). It demonstrates explicitly extreme global long-haul network latency operations successfully. Ingesting global Pub/Sub arrays actively, it executes real-time dynamic validations actively across boundaries to Accounting (`us-central1`) and Warehouse operations natively (`europe-west1`) securely scaling globally.

*   **`europe-west3` (Frankfurt) & `us-west1` (Oregon)**: The Edge Operations.
    *   The specialized Apigee API Management Enterprise Gateway establishes perimeter validation structurally in Oregon. It proxies deeply validated Partner HTTP streams directly downward seamlessly scaling to Frankfurt-hosted Partner APIs evaluating third-party logistics tracking actively.

### Microsoft Azure Regions

*   **`West Europe`**: The External Risk Operations.
    *   Hosts the `fraud-vnet`, acting as the principal proprietary analytics computation node mapping natively to the fundamental Azure Virtual Machine configuration. Interlaces seamlessly directly to GCP compute pools natively using IPsec telemetry utilizing a Dedicated / Partner Interconnect configuration to bypass dynamic internet protocols actively.

---

## 4. Infrastructure as Code (Terraform)

Deploying a multi-region, multi-cloud environment completely securely necessitates declarative Infrastructure as Code pipelines precisely decoupling application routing tables. Automation actively targets modular directories specifically eliminating monolithic, deeply interconnected configuration files inherently.

### Module Structural Mapping (`multicloud/gcp/terraform`)

*   **`main.tf`**: Sets core remote GCS bucket state configurations proactively, manages unified Google provider initialization structures globally, and establishes localized region variables actively.
*   **`dns.tf`**: Establishes the decoupled internal `internal.boutique.local` Private Cloud DNS zones managing seamless internal IP component visibility proactively for specific subnets exclusively.
*   **`inventory.tf`**: Creates the `inventory-vpc`, establishes isolated VMs, blocks generic public internet connections proactively, and compiles the complex Private Service Connect (PSC) Endpoint structures defining external visibility precisely.
*   **`crm.tf`**: Explicitly maps the regional Compute Engine Managed Instance Groups (MIG) arrays natively behind rigid internal routing bounds mapped explicitly to localized Internal TCP Load Balancing environments.
*   **`accounting.tf` & `warehouse.tf`**: Generates exact serverless deployment arrays for standard Docker nodes defining internal connectivity natively bridging direct localized VPC mappings specifically enabling dynamic Direct Egress configurations internally.
*   **`out_of_band.tf` / `legacy_pm.tf`**: Orchestrates deep packet inspection arrays utilizing GCP Network Security APIs and traditional Packet Mirroring architectures concurrently. Generates regional Mirroring Deployments explicitly parsing raw Geneve (UDP 6081) encapsulated packets.

---

## 5. Perimeter Governance

### VPC Service Controls (VPC SC)
Data isolation actively demands structural controls natively preventing lateral exfiltration natively across IAM boundaries specifically.

*   **The Security Posture**: The overarching architectural design securely enforces localized **VPC Service Controls** directly wrapping central BigQuery datasets securely parsing asynchronous order streams effectively.
*   **Why It Works**: When fully enabled, external application requests attempting queries or data exfiltration utilizing hypothetically hijacked highly-privileged Google Service Account keys natively fail abruptly. The VPC SC service strictly explicitly drops packets physically not explicitly originating statically from strictly mapped active corporate VPC environments dynamically.
