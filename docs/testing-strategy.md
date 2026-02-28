# Testing Strategy & Quality Assurance

The Multi-Cloud E-Commerce platform utilizes a diverse ecosystem of microservices spanning Google Kubernetes Engine, Serverless Cloud Run, and native Compute Engine virtual machines. Because the architecture relies heavily on decoupled asynchronous event routing (Pub/Sub) and rigid internal network segregation, a robust, multi-layered testing strategy is imperative.

This document outlines the proposed testing frameworks and methodologies required to validate the Node.js workloads within the `multicloud/gcp/` directory, the Go-based `checkoutservice`, and the underlying multi-cloud infrastructure.

---

## 1. Unit Testing (Isolated Component Logic)

Unit tests validate the internal business logic of each discrete microservice without relying on network I/O or external datastores.

### Node.js Microservices (`/gcp/*-service`)
*   **Frameworks**: **[Jest](https://jestjs.io/)** + **[Sinon.js](https://sinonjs.org/)**
*   **Approach**: 
    *   Test individual Express route handlers natively.
    *   Validate data transformations (e.g., modifying cart arrays into financial payloads in the `ordermanagement-service`).
    *   **Mocking**: Strictly mock Google Cloud client libraries (`@google-cloud/pubsub`, `@google-cloud/storage`) and utilize **[nock](https://github.com/nock/nock)** to intercept and stub outbound cross-service HTTP `fetch()` executions (preventing actual requests to internal IP addresses).

### Checkout Service (Go)
*   **Framework**: Native Go `testing` package (`go test`)
*   **Approach**: Validate cart pricing summation, currency localization math, and struct marshaling. Utilize Go interfaces to pass mock structs of the Pub/Sub clients and mock gRPC clients.

---

## 2. Integration Testing (Service & API Level)

Integration tests validate that a specific microservice's internal components (Database clients, Express routers, Cache layers) wire together correctly.

*   **Frameworks**: **Jest** + **[Supertest](https://github.com/ladjs/supertest)**
*   **Emulators**: 
    *   Utilize the **Google Cloud Pub/Sub Emulator** natively via Docker to validate that the `ordermanagement-service` accurately ingests, decodes base64, and parses Push Subscriptions accurately.
    *   Execute localized in-memory datastores (e.g., SQLite for testing CRM logic instead of requiring live Cloud SQL replication arrays).
*   **Execution**: Supertest spawns the Express.js application locally and executes physical HTTP invocations against the routing endpoints (e.g., `POST /transactions` on the Accounting service) to guarantee HTTP 200 validations and accurate JSON schema rendering.

---

## 3. Consumer-Driven Contract Testing

Because this architecture isolates Manufacturer domains (Warehouse/Accounting) from Consumer domains (Checkout/OrderManagement), brittle API assumptions inevitably orchestrate system outages.

*   **Framework**: **[Pact](https://pact.io/)**
*   **Approach**: 
    *   The `ordermanagement-service` (Consumer) defines the exact JSON schema it intends to `POST` to the `warehouse-service` (Provider).
    *   Pact generates a contract (`.json` file) representing this requirement.
    *   During the Warehouse Service's CI pipeline, it downloads this contract and executes it against its own API sequentially. If a developer alters the Warehouse API schema dynamically—breaking the OrderManagement expectation—the CI pipeline fails safely *before* terraform deployments execute.

---

## 4. Infrastructure & Network Testing (IaC)

Given the extreme reliance on Zero-Trust network topologies (Private Service Connect, Direct VPC Egress, ILBs), validating the application code is fundamentally insufficient; the network itself must be tested.

*   **Framework**: **[Terratest](https://terratest.gruntwork.io/)** (Go) or HashiCorp's `terraform test`
*   **Approach**: 
    *   Automate the spin-up of exact replica Terraform infrastructure pipelines inside isolated ephemeral GCP projects.
    *   Execute tests querying the GCP Networking API structurally checking if:
        1.  The `inventory-vpc` PSC Attachments are physically instantiated.
        2.  The `accounting` Cloud Run instances possess valid `/28` Serverless Access Connector routing arrays natively.
        3.  Internal Cloud DNS routes fundamentally resolve.

---

## 5. End-to-End (E2E) & System Testing

E2E testing replicates the actual user lifecycle, crossing the multi-region and multi-cloud perimeter boundaries in a staging replica.

*   **Frameworks**: **[Playwright](https://playwright.dev/)** or Cypress
*   **Approach**: 
    *   Simulate a customer navigating the frontend GKE service and completing a real checkout sequence.
    *   Validate the synchronous boundary logic: The system correctly triggers the Microsoft Azure Fraud Analytics API before confirming the UI.
    *   Validate the asynchronous boundary logic: Interrogate the downstream Node.js application logs dynamically using Cloud Logging API scripts to confirm the OrderManagement Cloud Run container successfully triggered and mapped the payloads correctly across VPC bounds.

---

## 6. Continuous Reliability (GCP Synthetic Monitors)

Once the infrastructure is successfully deployed to production, passive health checks are insufficient for a distributed architecture spanning multiple VPCs and external clouds. 

We will implement **[GCP Synthetic Monitors](https://cloud.google.com/monitoring/uptime-checks/synthetic-monitors)** (the evolution of legacy Uptime Checks) to continually assert the baseline operational health of the core routing components *from within the VPC boundaries*.

### Proposed Synthetic Monitor Suite:

1. **Internal API Monitor (Private Uptime Check)**
   * **Target**: Private REST APIs (Warehouse, Accounting, CRM ILB, Inventory ILB).
   * **Execution**: A Node.js Gen2 Cloud Function deployed directly onto the `inventory-vpc` and `core-vpc` utilizing Serverless VPC Egress.
   * **Action**: Executes a Mocha test suite every 5 minutes that fires `GET /health` requests to `http://crm.internal.boutique.local:8080/health` and `https://warehouse-api-service...run.app/health`.
   * **Value**: Instantly detects if internal routing rules, firewall appliances, or DNS arrays fail silently inside the perimeter.

2. **Frontend User Journey (Puppeteer Custom Uptime Check)**
   * **Target**: The Public GKE Load Balancer IP for the Online Boutique.
   * **Execution**: A Headless Chromium instance running in a Cloud Function executing on a global schedule (e.g., from `us-central1` and `europe-west1`).
   * **Action**: Automatically loads the homepage, adds a localized product to the cart, and clicks the checkout boundary.
   * **Value**: Affirms that the overarching microservices map natively aligns and handles public ingress structurally and functionally.

3. **External Cloud Boundary Audit (Azure Egress Check)**
   * **Target**: The external Microsoft Azure Fraud Analytics API.
   * **Execution**: A lightweight ping function.
   * **Value**: Monitors external latency limits and DNS resolutions crossing the public internet toward Azure components, independently from the Checkout Service.
