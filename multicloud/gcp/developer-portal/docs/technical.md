# Technical Architecture

This document catalogs the application topologies, system protocols, and API integrations orchestrating the microservices ecosystem. It focuses specifically on the interaction layers between logical components.

## 1. Interaction Mapping

The architecture implements a hybrid communication framework splitting operations into **synchronous** blocking calls during ingress validation, and **asynchronous** decoupled events for core fulfillment scaling.

### Phase 1: Synchronous Ingress & Validation
When a frontend user initiates a cart checkout, the `checkoutservice` invokes real-time RPC calls across internal domains to establish state consistency before concluding the HTTP transaction.

1. **CRM Lookup**: A synchronous retrieval of user account metadata executing explicitly via `GET /customers` across an internal network border to the CRM Service.
2. **Fraud Analytics**: The orchestrator triggers an external transaction risk calculation physically spanning across Google Cloud to Microsoft Azure. An HTTP `POST /metrics` passes `{ transactionType, durationMs, success }` payloads which natively returns an instantaneous boolean risk score.
3. **Inventory Reservation**: To prevent race-condition overselling, the application interrogates the Inventory Service via a synchronous `GET /inventory/{productId}` request to explicitly verify physical stock capacity prior to persisting the cart event.

### Phase 2: Asynchronous Event Distribution
Following successful synchronous validation, the `checkoutservice` finalizes the payment gate, permanently commits the user session, and returns an HTTP 200 explicitly to the client browser.

Simultaneously, the frontend tier publishes an `OrderConfirmedEvent` schema object onto a dedicated operational topic managed structurally by [Google Cloud Pub/Sub](https://cloud.google.com/pubsub).

### Phase 3: Distributed Order Fulfillment
Pub/Sub performs horizontal scale-out payload distribution, routing immutable event messages globally to downstream backend workloads triggered via push subscriptions.

1. **Order Management Execution**: Cloud Run environments running the OrderManagement Node.js process ingest the push event array dynamically and begin executing conditional logic routing.
2. **Accounting Ledger Sync**: OrderManagement executes a subsequent synchronous `POST /transactions` specifically into the Accounting Service. Natively, the Accounting Service sequentially conducts a retroactive `GET` request specifically against the original CRM Service logic to map transaction identities firmly to loyalty databases.
3. **Warehouse Dispatching**: The OrderManagement tier posts instructions utilizing `POST /shipments` directly to the Warehouse APIs. The Warehouse service logically triggers physical packing routines and initiates a final stock reconciliation backward mapping to the core Inventory Service utilizing a rigid `PUT /inventory/{productId}` structural edit.

---

## 2. API & Component Registry

The table below catalogs the deployment profiles, core structural protocols, and data mechanisms for each discrete application function.

| Service Name | Compute Target | Language Framework | Core Endpoints | State Pattern |
|--------------|----------------|--------------------|----------------|---------------|
| **Checkout** | GCP GKE | Go / Python | Internal Integrator | Stateless (Redis Cache) |
| **Event Broker**| GCP Pub/Sub | Managed PaaS | `Publish`, `Subscribe` | Managed Queues |
| **OrderManagement**| GCP Cloud Run | Node.js (Express)| Triggered via `POST /` | Stateless Event Processor |
| **Apigee API**| Google Cloud API | SaaS Matrix | Reverse Proxying / Auth | Token Caches |
| **Partner API** | GCP Cloud Run | Node.js (TypeScript) | `POST /tracking`, `GET /catalog` | Serverless Scale |
| **CRM Concierge**| GCP Vertex AI | TypeScript (ADK) | `POST /v1/chat` | LLM Session |
| **CRM** | GCP Compute VM | Node.js (Express) | `GET /customers`, `POST` | Persistent (Local SQLite/CloudSQL) |
| **Inventory**| GCP Compute VM | Node.js (Express) | `GET /inventory`, `PUT` | Operational Memory / Disk |
| **Warehouse**| GCP Cloud Run | Node.js (Express) | `POST /shipments` | Stateless Computing |
| **Accounting**| GCP Cloud Run | Node.js (Express) | `GET`, `POST`, `PUT` | Persistent (Local Memory / Disk) |
| **Fraud Engine**| Azure Virtual Machine| Node.js (Express) | `POST /metrics`, `GET` | Transitory Memory Cache |
| **Data Warehouse**| GCP BigQuery | Managed PaaS | Direct Streaming | Columnar Disk |
