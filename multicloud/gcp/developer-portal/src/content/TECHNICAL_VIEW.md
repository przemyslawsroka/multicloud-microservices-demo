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

### Phase 3: Order Lifecycle & Processing (Serverless Scale-out)
6.  **Event Broker $\rightarrow$ Order Management System (OrderManagement - Cloud Run)**: 
    - OrderManagement is triggered automatically via a Pub/Sub Push Subscription (Eventarc). It ingests the `OrderConfirmedEvent` payload.
7.  **OrderManagement $\rightarrow$ Accounting (Cloud Run)**: 
    - OrderManagement forwards financial payloads via synchronous POST to Accounting.
    - *API Pattern*: REST `POST /transactions`.
    - *Side-Effect Link*: The Accounting service simultaneously fetches billing data backward from the original **CRM Service (VM)** via synchronous GET.
8.  **OrderManagement $\rightarrow$ Warehouse (Cloud Run)**: 
    - OrderManagement fires a fulfillment POST Request to the Warehouse APIs.
    - *Side-Effect Link*: The Warehouse service updates stock ledgers backward on the **Inventory Service (VM)** via `PUT /inventory/{productId}`.

### Phase 4: B2B Integration (Public APIs)
9.  **External B2B Partners $\rightarrow$ Apigee Gateway**: 
    - Third-party logistics (3PL) carriers and resellers hit the company's public-facing developer API portal. Apigee evaluates developer API keys, monetization quotas, and security policies before proxying traffic inward.
10. **Apigee Gateway $\rightarrow$ Partner API Service (Cloud Run)**: 
    - Apigee proxies the authenticated traffic securely to the fully isolated Serverless application running natively in Node.js/TypeScript.
    - *API Pattern*: REST `POST /logistics/tracking` and `GET /catalog/products`.

### Phase 5: Big Data Intelligence
11. **Event Broker $\rightarrow$ Data Warehouse (BigQuery)**: 
    - A direct BigQuery Pub/Sub Subscription ingests all event logs purely asynchronously, requiring zero compute overhead from the GKE cluster.

### Phase 6: Agentic AI Integration (MCP & ADK)
12. **Frontend UI $\rightarrow$ AI Concierge (Agent Engine)**:
    - The custom Concierge Chat Widget interacts with the `frontend_concierge` agent securely over REST HTTP mimicking the Agent Engine framework wrapper.
13. **AI Concierge $\rightarrow$ Back-Office CRM Agent (Agent-to-Agent)**:
    - The concierge utilizes A2A delegation to securely proxy logic off to the `crm_investigator` for private data lookups, isolating user prompts securely.
14. **Back-Office CRM Agent $\rightarrow$ CRM Service (MCP)**:
    - The investigator utilizes the Model Context Protocol (MCP) securely over SSE to execute deterministic database tooling (`lookup_customer`, `find_order`) directly against the CRM Node backend.

---

## 2. Component Technical Profiles

| Service Name | Platform | Language / Stack | Core Endpoints | State Storage |
|--------------|----------|------------------|----------------|---------------|
| **Checkout** | GCP GKE | Go / Python | Internal orchestrator | Stateless (Redis) |
| **Event Broker**| GCP Pub/Sub | Managed SaaS | `Publish`, `Subscribe` | Managed Queues |
| **OrderManagement**| GCP Cloud Run | Node.js | Triggered via `POST /` | Serverless Scale |
| **Apigee API**| Google Cloud API | SaaS API Management | Reverse Proxying / Auth | Token Caches |
| **Partner API** | GCP Cloud Run | Node.js (TS) | `POST /tracking`, `GET /catalog` | Serverless Scale |
| **CRM Concierge**| GCP Vertex AI | TypeScript (ADK) | `POST /v1/chat` | LLM Session |
| **CRM** | GCP Compute VM | Node.js (Express) | `GET /customers` | Local SQLite/CloudSQL |
| **Inventory**| GCP Compute VM | Node.js (Express) | `GET /inventory`, `PUT` | Memory / Disk |
| **Warehouse**| GCP Cloud Run | Node.js (Express) | `POST /shipments` | Stateless |
| **Accounting**| GCP Cloud Run | Node.js (Express) | `GET`, `POST`, `PUT` | Memory / Disk |
| **Fraud Engine**| Azure VM | Node.js (Express) | `POST /metrics`, `GET` | Machine Memory |
| **Data Warehouse**| GCP BigQuery | Managed PaaS | Direct Streaming | Columnar Disk |
