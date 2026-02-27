# Global Deployment Topology (Deployment View)

This document visualizes the physical distribution of all microservices, virtual machines, serverless containers, and cloud PaaS infrastructures.

A core component of the "Online Boutique" demonstration is emphasizing *multi-region* and *multi-cloud* (East-West) network traversal. By scattering services globally, we effectively simulate a multinational enterprise integration scenario.

---

## 1. Google Cloud Regions (GCP)

### 1.1 `us-central1` (Iowa) - Core Compute & Finance
*   **GKE Cluster (`online-boutique-cluster`)**: Hosts the primary storefront and the `checkoutservice` orchestrator.
*   **Vertex AI Agent Engine (`crm-concierge`)**: AI compute container utilizing the `gemini-3-flash-preview` foundational model and the Google ADK.
*   **Accounting Service**: Serverless Cloud Run application routing financial payloads. Connects to the CRM network via a Serverless VPC Access Connector.
*   **Furniture Service (`furniture-vpc`)**: Legacy VM-based inventory for freight items connected to the GKE cluster via HA Cloud VPN.

### 1.2 `asia-east1` (Taiwan) - Customer Identity (Legacy)
*   **CRM Service (`crm-vpc`)**: The monolithic Customer Relationship Management system. Consists of multiple VMs behind a regional Internal Load Balancer (ILB), natively connected to a regional Cloud SQL instance.

### 1.3 `europe-west1` (Belgium) - Standard Logistics
*   **Inventory Service (`inventory-vpc`)**: Local VM storing high-frequency stock data. Published to the `us-central1` GKE cluster strictly over Private Service Connect (PSC).
*   **Warehouse Service**: Cloud Run application triggering physical dispatch. Communicates natively with the adjacent Inventory VMs via Direct VPC Egress.

---

## 2. Distributed Expansion Components (Proposed Architecture)

To maximize the demonstration of Google's global fiber backbone and cross-regional traffic routing, the newly established Backend Operations and B2B API layers are deliberately deployed in disparate geographical zones.

### 2.1 `australia-southeast1` (Sydney) - Order Orchestration
*   **Order Management System (OrderManagement)**: Serverless Cloud Run application. Demonstrates extreme long-haul integration. When triggered by a global Pub/Sub event, OrderManagement successfully fires high-latency cross-region API executions to Accounting (`us-central1`) and Warehouse (`europe-west1`) over Google's planetary network.

### 2.2 `us-west1` (Oregon) - Border API Shielding
*   **API Management (Apigee)**: A dedicated enterprise gateway endpoint for all B2B partner connectivity (external validation) and internal OrderManagement exposure (JWT authorization). 

### 2.3 `europe-west3` (Frankfurt) - Partner Integration Layer
*   **Partner API Service**: Serverless Cloud Run application serving European 3PL carriers and B2B Dropshippers. Apigee (`us-west1`) reverse-proxies authenticated requests completely securely to this backend over the Google edge network via Serverless NEGs.

### 2.4 Multi-Region Deployments
*   **Event Broker (Pub/Sub)**: Global message routing. Topics span regions transparently, ingesting `publish` actions natively in `us-central1` and executing `push` webhooks in `australia-southeast1`.
*   **Data Warehouse (BigQuery)**: Deployed as an **EU Multi-Region** dataset ensuring all aggregated telemetry and compliance ledgers adhere to European data residency directives while ingesting global streams.

---

## 3. Microsoft Azure Regions

### 3.1 `West Europe` - Risk & Compliance
*   **Fraud Detection Engine (`fraud-vnet`)**: The primary risk analytics virtual machine. Deployed in Azure and linked directly to the GCP `us-central1` compute nodes over a Dedicated / Partner Interconnect to bypass the public internet seamlessly.
