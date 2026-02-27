# Multicloud E-Commerce Architecture: High-Level Business Requirements

## 1. Executive Summary & Business Story

"Online Boutique" is a rapidly growing global e-commerce enterprise. Historically, the company operated on a monolithic architecture, but following recent corporate acquisitions and a drive toward modernization, the IT landscape has evolved into a distributed, multi-cloud microservices ecosystem. 

The core storefront operates on a Google Kubernetes Engine (GKE) cluster. However, the business logic required to fulfill a customer order—checking stock, updating customer records, processing finances, and analyzing sales—is spread across discrete backend systems. Some of these systems run on Google Cloud Platform (GCP) virtual machines, some have been modernized to GCP serverless architectures (Cloud Run), and due to a recent merger, the company's entire analytics engine resides in Microsoft Azure.

**The primary business objective** is to execute a seamless, real-time checkout process that orchestrates transactions across all these heterogeneous systems.

**The core technical objective** (and the purpose of this demonstration) is to securely connect these distributed systems across different compute platforms (GKE, Compute Engine, Cloud Run) and cloud providers (GCP, Azure) *without* exposing internal business data to the public internet. This showcases advanced networking topologies including Private Service Connect (PSC), Serverless VPC Access Connectors, Internal Load Balancing (ILB), and Cross-Cloud Interconnect/VPN.

---

## 2. System Components overview

### 2.1 Core E-Commerce Front (GCP / GKE)
*   **Checkout Service (`checkoutservice`)**: The central orchestrator. When a user places an order on the storefront, this service acts as the integration hub. It holds the responsibility of making synchronous external API calls to various multicloud business APIs to validate, record, and fulfill the order.

### 2.2 Enterprise Resource Planning & Backend (GCP / Custom VPCs)
These systems representing traditional enterprise workloads deployed across disparate internal networks.
*   **Customer Relationship Management (CRM) Service**: Maintains customer profiles, loyalty tiers, and account standing.
*   **Inventory Service**: The master ledger for standard product stock levels.
*   **Furniture Service**: A specialized inventory system handling bulky, high-margin freight items.

### 2.3 Modernized Serverless Operations (GCP / Cloud Run)
Newly developed systems utilizing serverless infrastructure for dynamic scaling.
*   **Warehouse Service**: Handles complex shipping logistics and fulfillment dispatching.
*   **Accounting Service**: Records financial ledgers, tax calculations, and revenue recognition.

### 2.4 Data Intelligence (Microsoft Azure)
*   **Analytics Service**: A real-time data ingestion engine that processes completed transactions to drive live executive sales dashboards and fraud-detection AI.

---

## 3. The Checkout Flow: Multi-System Communication

When a customer clicks "Place Order", the `checkoutservice` initiates the following communication sequence:

### Phase 1: Validation & Availability
1.  **Checkout $\rightarrow$ CRM**: The Checkout Service queries the CRM backend to validate the customer's identity and apply any relevant loyalty discounts. 
    *   *Networking Context:* The CRM system is locked behind an Internal TCP Load Balancer in a dedicated GCP VPC. The Checkout service communicates securely over private internal IP space.
2.  **Checkout $\rightarrow$ Inventory & Furniture**: The Checkout Service verifies stock availability across parallel systems.
    *   *Networking Context:* The Inventory service resides in its own highly restricted GCP VPC, exposed back to the core GKE cluster purely via **Private Service Connect (PSC)**. The Furniture service is accessed via direct VPC Peering.

### Phase 2: Processing & Logistics (Service-to-Service Chains)
3.  **Checkout $\rightarrow$ Accounting**: The financial record of the sale is pushed to the Accounting API. 
    *   *Chained Communication:* To generate an invoice, the **Accounting Service (Cloud Run) must communicate back to the CRM Service (VM)** to retrieve the customer's billing profile.
    *   *Networking Context:* Because Accounting is serverless, it uses a **Serverless VPC Access Connector** (or Direct VPC Egress) to securely reach the private, internal load-balanced IP of the CRM system.
4.  **Checkout $\rightarrow$ Warehouse**: The fulfillment request is sent to the Warehouse API to pack the box.
    *   *Chained Communication:* The **Warehouse Service (Cloud Run)** needs to verify the physical location of the goods, meaning it **must communicate securely with the Inventory Service (VM)**.
    *   *Networking Context:* The Warehouse service similarly uses serverless networking to traverse the GCP backbone and hit the Inventory system's private endpoints.

### Phase 3: Global Data Sync
5.  **Checkout $\rightarrow$ Azure Analytics**: Once the order is confirmed, the transaction payload is streamed to the Analytics engine.
    *   *Networking Context:* This traffic completely skirts the public internet. The Checkout Service routes packets through a dedicated **Cloud VPN or Dedicated Interconnect** directly into the Microsoft Azure VNet, securely depositing the data into the remote private IP of the Azure Analytics VM.

---

## 4. Key Networking & Security Requirements Demonstrated

By executing this business narrative, the architecture fulfills the following strict enterprise network constraints:

1.  **Zero Public Ingress**: Backend APIs (CRM, Inventory, Furniture) must NEVER be exposed to the public internet. They only possess internal IP addresses (RFC 1918).
2.  **Consumer/Producer Separation**: The Inventory system must be network-isolated from the primary GKE cluster to prevent lateral movement. It is exclusively published as a **Private Service Connect (PSC)** endpoint, ensuring precise, unidirectional API exposure.
3.  **Serverless internal integration**: Modern serverless apps (Accounting, Warehouse) must be capable of reaching backward into legacy VPC-bound endpoints (CRM, Inventory) without relying on public routing.
4.  **Multi-Cloud Privacy**: Integration with the Azure Analytics platform must traverse a private, encrypted tunnel (VPN/Interconnect) to comply with data privacy regulations. 
5.  **Scalable Internal Load Balancing**: Traffic to critical monolithic VMs (like CRM) must be transparently distributed via GCP Internal Load Balancers (ILB) to ensure high availability during traffic spikes without changing client endpoints.
