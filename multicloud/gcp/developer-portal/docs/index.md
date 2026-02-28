# 🌩️ Multi-Cloud E-Commerce Demo
## Developer Reference Portal

Welcome! The primary goal of this portal is to educate developers on how to construct a complex, real-world microservice system leveraging enterprise Google Cloud Platform networking products.

This documentation demonstrates advanced topologies replacing simple VPC Peering with strictly controlled constructs like **Private Service Connect (PSC)**, **Direct VPC Egress**, and encrypted **Interconnect/BGP Routing**.

Whether you are exploring the overarching Business architecture, investigating how we route Cloud Run workloads natively using Serverless VPC connectors, or seeing how we simulate on-prem infrastructure using BGP Interconnects—everything is documented here.

---

## 📚 Core Documentation

Dive into the four fundamental views defining this architecture:

### 1. Business View
Understand the high-level logical capabilities, enterprise resource planning structures, risk engines, and real-time operations orchestrating checkout fulfillment across the multi-cloud architecture. Features beautiful Mermaid architectural diagrams.

[Explore Business View](BUSINESS_VIEW.md){ .md-button .md-button--primary }

### 2. Networking View
Deeply discover how Private Service Connect, Serverless VPC Access, NAT-less Private Google Access, and advanced Cloud Load Balancing route traffic safely without exposing massive blast-radius attack vectors. This is the **primary educational module** for mastering modern networking concepts.

[Examine Networking Topologies](NETWORKING_VIEW.md){ .md-button }

### 3. Technical Profiles
Explore our robust technical catalog delineating each discrete microservice stack (Go, Python, TypeScript, Express). See exact API integration patterns (e.g., `POST /transactions` or `GET /customers`), state management bounds, and database profiles.

[View Technical Profiles](TECHNICAL_VIEW.md){ .md-button }

### 4. Deployment Topologies
Examine how Terraform orchestrates resources, the regional vs global distributions of Google Kubernetes Engine (GKE) clusters versus Cloud Run managed serverless environments.

[See Deployment Specs](DEPLOYMENT_VIEW.md){ .md-button }

---

!!! tip "Getting Started"
    If you're a developer newly onboarding to this architecture, we strongly recommend starting with the **Business View** to map domain boundaries, before deep-diving into the sprawling **Networking View**.

<br/>

*Built with ♥️ using [`Material for MkDocs`](https://squidfunk.github.io/mkdocs-material/)*
