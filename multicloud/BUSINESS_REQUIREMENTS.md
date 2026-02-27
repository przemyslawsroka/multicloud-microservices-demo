# Multicloud E-Commerce Architecture: High-Level Business Requirements

## 1. Executive Summary & Business Story

"Online Boutique" is a rapidly growing global e-commerce enterprise. Historically, the company operated on a monolithic architecture, but following recent corporate acquisitions and a drive toward modernization, the IT landscape has evolved into a distributed, multi-cloud microservices ecosystem. 

The core storefront operates on a Google Kubernetes Engine (GKE) cluster. However, the business logic required to fulfill a customer order—checking stock, updating customer records, processing finances, and evaluating fraud risk—is spread across discrete backend systems. Some of these systems run on Google Cloud Platform (GCP) virtual machines, some have been modernized to GCP serverless architectures (Cloud Run), while the company's proprietary fraud detection engine resides in Microsoft Azure following a recent merger.

**The primary business objective** is to execute a seamless, real-time checkout process that orchestrates transactions across all these heterogeneous systems.

**The core technical objective** (and the purpose of this demonstration) is to securely connect these distributed systems across different compute platforms (GKE, Compute Engine, Cloud Run) and cloud providers (GCP, Azure) *without* exposing internal business data to the public internet. This showcases advanced networking topologies including Private Service Connect (PSC), Serverless VPC Access Connectors, Internal Load Balancing (ILB), and Cross-Cloud Interconnect/VPN.

---

## 2. System Components overview

### 2.1 Core E-Commerce Front & Integration Layer (GCP / GKE)
*   **Checkout Service (`checkoutservice`)**: The central orchestrator. When a user places an order on the storefront, this service acts as the integration hub. It holds the responsibility of making synchronous external API calls to various multicloud business APIs to validate, record, and fulfill the order.
*   **API Gateway**: The single entry point for all client requests. It handles routing, rate limiting, load balancing, and aggregates data from multiple microservices to send back to the client.
*   **Event Broker / Message Queue**: Enables asynchronous communication between microservices (e.g., Kafka, Pub/Sub, RabbitMQ). For example, when an order is placed, it broadcasts an event so inventory, payment, and email services can react independently.

### 2.2 Enterprise Resource Planning & Backend (GCP / Custom VPCs)
These systems representing traditional enterprise workloads deployed across disparate internal networks.
*   **Customer Relationship Management (CRM) Service**: Maintains customer profiles, loyalty tiers, and account standing.
*   **Inventory Service**: The master ledger for standard product stock levels.
*   **Furniture Service**: A specialized inventory system handling bulky, high-margin freight items.

### 2.3 Modernized Serverless Operations (GCP / Cloud Run)
Newly developed systems utilizing serverless infrastructure for dynamic scaling.
*   **Order Management System (OMS)**: Takes over once a checkout is complete. It manages the lifecycle of an order: processing, fulfillment routing, shipping updates, and returns.
*   **Warehouse Service**: Handles complex shipping logistics and fulfillment dispatching.
*   **Accounting Service**: Records financial ledgers, tax calculations, and revenue recognition.

### 2.4 Risk & Compliance (Microsoft Azure)
*   **Fraud Detection Engine**: A real-time risk analysis system remaining in Azure following a corporate merger. It evaluates transaction metadata to compute risk scores, flag anomalous behavior, and prevent fraudulent orders before fulfillment.

### 2.5 Enterprise Data Intelligence (GCP / BigQuery)
*   **Data Warehouse (BigQuery)**: The primary, highly scalable enterprise data warehouse. It continuously aggregates telemetry, financial ledgers, logistics data, and user events from across the entire microservice ecosystem to drive executive business intelligence (BI) dashboards, generate compliance reports, and train predictive machine learning models.

---

## 3. The Checkout Flow: Multi-System Communication

When a customer clicks "Place Order", the system initiates the following communication sequence:

### Phase 1: Ingress & Validation
1.  **Client $\rightarrow$ API Gateway**: The API Gateway intercepts the client's request, handling rate-limiting and passing the payload to the Checkout Service.
2.  **Checkout $\rightarrow$ CRM**: The Checkout Service queries the CRM backend to validate the customer's identity and apply any relevant loyalty discounts. 
    *   *Networking Context:* The CRM system is locked behind an Internal TCP Load Balancer in a dedicated GCP VPC. The Checkout service communicates securely over private internal IP space.
3.  **Checkout $\rightarrow$ Inventory & Furniture**: The Checkout Service verifies stock availability across parallel systems.
    *   *Networking Context:* The Inventory service resides in its own highly restricted GCP VPC, exposed back to the core GKE cluster purely via **Private Service Connect (PSC)**. The Furniture service is accessed via direct VPC Peering.

### Phase 2: Asynchronous Event Broadcasting
4.  **Checkout $\rightarrow$ Event Broker**: Once validated, the Checkout Service publishes an "Order Confirmed" event to the Event Broker / Message Queue, allowing backend services to react asynchronously without holding up the customer's web request.

### Phase 3: Order Lifecycle & Processing
5.  **Event Broker $\rightarrow$ Order Management System (OMS)**: The OMS consumes the event and assumes responsibility for the order's lifecycle, orchestrating the Accounting and Warehouse operations.
6.  **OMS $\rightarrow$ Accounting**: The financial record of the sale is pushed to the Accounting API. 
    *   *Chained Communication:* To generate an invoice, the **Accounting Service (Cloud Run)** communicates back to the **CRM Service (VM)** to retrieve the customer's billing profile.
    *   *Networking Context:* Because Accounting is serverless, it uses a **Serverless VPC Access Connector** (or Direct VPC Egress) to securely reach the private, internal load-balanced IP of the CRM system.
7.  **OMS $\rightarrow$ Warehouse**: The fulfillment request is dispatched to the Warehouse API to pack the box.
    *   *Chained Communication:* The **Warehouse Service (Cloud Run)** verifies the physical location of the goods, communicating securely with the **Inventory Service (VM)**.
    *   *Networking Context:* The Warehouse service similarly uses serverless networking to traverse the GCP backbone and hit the Inventory system's private endpoints.

### Phase 4: Global Data Sync
8.  **Data Warehouse & Analytics (Azure)**: The transaction payload is streamed asynchronously to the Data Lake and Analytics engine to train machine learning models and power BI dashboards.
    *   *Networking Context:* This traffic completely skirts the public internet. Telemetry is routed through a dedicated **Cloud VPN or Dedicated Interconnect** directly into the Microsoft Azure VNet, securely depositing the data into the remote private IP of the Azure data suite.

---

## 4. Key Networking & Security Requirements Demonstrated

By executing this business narrative, the architecture fulfills the following strict enterprise network constraints:

1.  **Zero Public Ingress**: Backend APIs (CRM, Inventory, Furniture) must NEVER be exposed to the public internet. They only possess internal IP addresses (RFC 1918).
2.  **Consumer/Producer Separation**: The Inventory system must be network-isolated from the primary GKE cluster to prevent lateral movement. It is exclusively published as a **Private Service Connect (PSC)** endpoint, ensuring precise, unidirectional API exposure.
3.  **Serverless internal integration**: Modern serverless apps (Accounting, Warehouse) must be capable of reaching backward into legacy VPC-bound endpoints (CRM, Inventory) without relying on public routing.
4.  **Multi-Cloud Privacy**: Integration with the Azure Analytics platform must traverse a private, encrypted tunnel (VPN/Interconnect) to comply with data privacy regulations. 
5.  **Scalable Internal Load Balancing**: Traffic to critical monolithic VMs (like CRM) must be transparently distributed via GCP Internal Load Balancers (ILB) to ensure high availability during traffic spikes without changing client endpoints.
