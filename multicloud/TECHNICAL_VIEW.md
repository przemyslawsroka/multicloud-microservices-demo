# Technical System Design (Technical View)

This document specifies the technical design, API communication patterns, and systemic integrations across the "Online Boutique" multi-cloud microservices platform.

## 1. System Communication Map

The core challenge of this architecture is bridging modern serverless technologies (Cloud Run), Kubernetes orchestrations (GKE), and bare-metal scaled Virtual Machines across different cloud providers.

### Phase 1: Ingress & Validation (Synchronous REST APIs)
1.  **Checkout (`checkoutservice` as GKE LoadBalancer)** $\rightarrow$ **CRM Service (VM)**: 
    - The Checkout Service queries the CRM backend via a standard HTTP GET explicitly pointing to an internal load balancer IP.
    - *API Pattern*: REST `GET /health` and `GET /customers`.
3.  **Checkout $\rightarrow$ Fraud Detection Engine (Azure VM)**: 
    - The system runs a synchronous transaction risk check.
    - *API Pattern*: REST `POST /metrics` passing `{ transactionType, durationMs, success }` which returns a `{ riskScore }`.
4.  **Checkout $\rightarrow$ Inventory & Furniture (VMs)**: 
    - The Checkout Service verifies stock levels before holding items in the cart.
    - *API Pattern*: REST `GET /inventory/{productId}` returning stock JSON.

### Phase 2: Asynchronous Event Broadcasting (Pub/Sub)
5.  **Checkout $\rightarrow$ Event Broker (Google Cloud Pub/Sub)**: 
    - Once the synchronous validation clears, the Checkout Service commits the cart and publishes a deeply decoupled domain event: `OrderConfirmedEvent`.
    - *API Pattern*: gRPC/HTTP publishing to Pub/Sub topic spanning the entire application graph.

### Phase 3: Order Lifecycle & Processing (Serverless Apigee Proxy)
6.  **Event Broker $\rightarrow$ Apigee Gateway**: 
    - The Pub/Sub Push Subscription explicitly targets the Apigee Gateway URL. Apigee intercepts the webhook, authenticates the GCP service account token, extracts quotas, and logs the API usage.
7.  **Apigee Gateway $\rightarrow$ Order Management System (OMS)**: 
    - Once Apigee policies successfully clear the payload, it acts as a reverse proxy, forwarding the event directly to the private REST API of the OMS (running securely on Cloud Run).
8.  **OMS $\rightarrow$ Accounting (Cloud Run)**: 
    - The OMS forwards financial payloads via synchronous POST to Accounting.
    - *API Pattern*: REST `POST /transactions`.
    - *Side-Effect Link*: The Accounting service simultaneously fetches billing data backward from the original **CRM Service (VM)** via synchronous GET.
8.  **OMS $\rightarrow$ Warehouse (Cloud Run)**: 
    - The OMS fires a fulfillment POST Request to the Warehouse APIs.
    - *Side-Effect Link*: The Warehouse service updates stock ledgers backward on the **Inventory Service (VM)** via `PUT /inventory/{productId}`.

### Phase 4: Big Data Intelligence
9.  **Event Broker $\rightarrow$ Data Warehouse (BigQuery)**: 
    - A direct BigQuery Pub/Sub Subscription ingests all `OrderConfirmedEvent` logs purely asynchronously, requiring zero compute overhead from the GKE cluster.

---

## 2. Component Technical Profiles

| Service Name | Platform | Language / Stack | Core Endpoints | State Storage |
|--------------|----------|------------------|----------------|---------------|
| **Checkout** | GCP GKE | Go / Python | Internal orchestrator | Stateless (Redis) |
| **Apigee API**| Google Cloud API | SaaS API Management | Reverse Proxying / Auth | Token Caches |
| **Event Broker**| GCP Pub/Sub | Managed SaaS | `Publish`, `Subscribe` | Managed Queues |
| **OMS** | GCP Cloud Run | Go (`net/http`) | `POST /orders/fulfill` | Serverless Scale |
| **CRM** | GCP Compute VM | Node.js (Express) | `GET /customers` | Local SQLite/CloudSQL |
| **Inventory**| GCP Compute VM | Node.js (Express) | `GET /inventory`, `PUT` | Memory / Disk |
| **Warehouse**| GCP Cloud Run | Node.js (Express) | `POST /shipments` | Stateless |
| **Accounting**| GCP Cloud Run | Node.js (Express) | `GET`, `POST`, `PUT` | Memory / Disk |
| **Fraud Engine**| Azure VM | Node.js (Express) | `POST /metrics`, `GET` | Machine Memory |
| **Data Warehouse**| GCP BigQuery | Managed PaaS | Direct Streaming | Columnar Disk |
