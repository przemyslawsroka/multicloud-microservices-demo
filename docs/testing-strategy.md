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
