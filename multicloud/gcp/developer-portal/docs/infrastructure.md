# Infrastructure & Operations

This section outlines the physical multi-region deployment map across Google Cloud and Microsoft Azure, and specifically details the underlying Infrastructure as Code (IaC) modularity utilizing Terraform to orchestrate the environment automatically.

By distributing resources globally, the architecture simulates realistic physical latency and cross-regional routing boundaries mandated by expansive enterprise operations protocols securely.

---

## 1. Multi-Regional Deployment Topology

To ensure strict network boundaries and to study high-latency structural conditions authentically, backend and API processes execute in disparate geographical zones.

### Google Cloud Regions

*   **`us-central1` (Iowa)**: The Core Compute Zone.
    *   Houses the primary GKE Autopilot cluster (`online-boutique-cluster`), executing the entire synchronous storefront checkout process actively.
    *   Hosts the Vertex AI Agent Engine (`crm-concierge`), utilizing the `gemini-1.5-pro` model alongside the Google Agent Development Kit (ADK) parameters.
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

## 2. Infrastructure as Code (Terraform)

Deploying a multi-region, multi-cloud environment completely securely necessitates declarative Infrastructure as Code pipelines precisely decoupling application routing tables. Automation actively targets modular directories specifically eliminating monolithic, deeply interconnected configuration files inherently.

### Module Structural Mapping (`multicloud/gcp/terraform`)

*   **`main.tf`**: Sets core remote GCS bucket state configurations proactively, manages unified Google provider initialization structures globally, and establishes localized region variables actively.
*   **`dns.tf`**: Establishes the decoupled internal `internal.boutique.local` Private Cloud DNS zones managing seamless internal IP component visibility proactively for specific subnets exclusively.
*   **`inventory.tf`**: Creates the `inventory-vpc`, establishes isolated VMs, blocks generic public internet connections proactively, and compiles the complex Private Service Connect (PSC) Endpoint structures defining external visibility precisely.
*   **`crm.tf`**: Explicitly maps the regional Compute Engine Managed Instance Groups (MIG) arrays natively behind rigid internal routing bounds mapped explicitly to localized Internal TCP Load Balancing environments.
*   **`accounting.tf` & `warehouse.tf`**: Generates exact serverless deployment arrays for standard Docker nodes defining internal connectivity natively bridging direct localized VPC mappings specifically enabling dynamic Direct Egress configurations internally.

---

## 3. Perimeter Governance

### VPC Service Controls (VPC SC)
Data isolation actively demands structural controls natively preventing lateral exfiltration natively across IAM boundaries specifically.

*   **The Security Posture**: The overarching architectural design securely enforces localized **VPC Service Controls** directly wrapping central BigQuery datasets securely parsing asynchronous order streams effectively.
*   **Why It Works**: When fully enabled, external application requests attempting queries or data exfiltration utilizing hypothetically hijacked highly-privileged Google Service Account keys natively fail abruptly. The VPC SC service strictly explicitly drops packets physically not explicitly originating statically from strictly mapped active corporate VPC environments dynamically.
