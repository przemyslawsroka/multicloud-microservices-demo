# 🌩️ Multi-Cloud E-Commerce Demo

Welcome to the Multi-Cloud E-Commerce Demo developer documentation. This project provides a reference architecture for a distributed microservices system across multiple environments, demonstrating the practical application of Google Cloud networking, compute, and security products alongside multi-cloud integration.

It serves as an educational resource to illustrate how disparate systems—running on Google Kubernetes Engine (GKE), Google Cloud Run, Google Compute Engine (GCE), and Microsoft Azure Virtual Machines—communicate securely and reliably using modern enterprise networking topologies.

---

## 🎯 Educational Focus

This documentation is designed for Software Engineers (SWEs), Network Engineers, and Product Managers (PMs) to understand and evaluate advanced system design and network perimeters in practice. 

By exploring this architecture, you will learn how to:

- **Apply Zero-Trust Networking**: Understand the specific use cases for Private Service Connect (PSC) and Internal Load Balancing (ILB) to enforce strict service boundaries, moving beyond traditional flat Virtual Private Cloud (VPC) peering.
- **Connect Serverless Workloads Securely**: Compare Direct VPC Egress with Serverless VPC Access Connectors when routing Cloud Run applications into private corporate networks.
- **Implement Multi-Cloud Integrations**: Route secure communication across cloud boundaries (GCP to Azure) utilizing Dedicated Interconnects or HA VPNs coupled with BGP dynamic routing.
- **Govern B2B External Access**: Use Apigee API Management to protect internal workloads from third-party partners operating over the public internet.
- **Enable Event-Driven Operations**: Utilize Google Cloud Pub/Sub and BigQuery for asynchronous process decoupling and data analytics respectively.

---

## 📚 Documentation Navigation

To systematically understand the system, we recommend exploring the modules in the following order:

### 1. [Business Domains](business.md)
Understand what the application components do. This section outlines the functional areas of the e-commerce platform, such as order fulfillment, fraud analysis, and inventory management, without delving into the underlying code.

[Explore Business Domains](business.md){ .md-button .md-button--primary }

### 2. [Technical Architecture](technical.md)
A breakdown of the APIs, data flows, and inter-service communication patterns. This covers the transition from synchronous validation to asynchronous event-driven state processing.

[Explore Technical Architecture](technical.md){ .md-button }

### 3. [Cloud Networking](networking.md)
The core educational module. A detailed analysis of how traffic physically routes between isolated VPCs, including configurations for PSC, Cloud DNS, ILB, Direct VPC Egress, and Private Google Access.

[Master Cloud Networking](networking.md){ .md-button }

### 4. [Infrastructure & DevOps](infrastructure.md)
A review of the multi-region deployment map across Google Cloud and Azure, the Terraform infrastructure-as-code structure, and perimeter controls like VPC Service Controls (VPC SC).

[See Infrastructure Specs](infrastructure.md){ .md-button }

---

<br/>

*Built with ♥️ using [`Material for MkDocs`](https://squidfunk.github.io/mkdocs-material/).*
