# DNS & SSL Configuration

This section details the domain name registration and the multiple methods used to secure HTTP endpoints horizontally across the `gcp-ecommerce-demo.com` domain. Different workloads implemented in GCP (GKE, Cloud Run, and pure Compute Engine) each utilize different native Google Cloud patterns for managing and serving SSL/TLS certificates.

## Domain Registration
The base domain, `gcp-ecommerce-demo.com`, was registered entirely via **Google Cloud Domains**. Note that while Cloud Domains facilitated the registration and provided a streamlined interface native to Google Cloud, the underlying authoritative registrar for the domain is **Squarespace**.

Registration via Cloud Domains automatically provisions a Google Cloud DNS managed zone (`gcp-ecommerce-demo-com`) and populates it with correct NS/SOA records. Our infrastructure uses Terraform (`data "google_dns_managed_zone"`) to lookup this managed zone dynamically, avoiding Terraform applying conflicts and ensuring all automatically created registrar settings remain intact.

## Application Load Balancing & SSL Provisioning

Securing an endpoint over HTTPS requires a Google-managed SSL certificate and a functioning L7 network layer (like a Global External HTTP(S) Load Balancer). Because our workloads span different GCP execution platforms, the specific implementation securing each layer varies:

### 1. Developer Portal (Cloud Run)
**Endpoint:** `docs.gcp-ecommerce-demo.com`

* **Platform:** Google Cloud Run.
* **Mechanism:** Cloud Run natively provisions its own managed certificates when a Custom Domain Mapping is created.
* **Process:** By defining a `google_cloud_run_domain_mapping` in Terraform, Cloud Run is instructed to manage traffic for the `docs` subdomain. Once the corresponding CNAME record (`ghs.googlehosted.com.`) is published in our DNS zone, Cloud Run transparently provisions and auto-renews a Google-managed certificate. No distinct load balancer or certificate resource needs to be orchestrated explicitly.

### 2. Online Boutique (Google Kubernetes Engine)
**Endpoint:** `gcp-ecommerce-demo.com` and `www.gcp-ecommerce-demo.com`

* **Platform:** GKE (Kubernetes).
* **Mechanism:** GKE `Ingress` controller coupled with a `ManagedCertificate` Custom Resource Definition (CRD).
* **Process:** Instead of directly exposing a basic TCP `LoadBalancer` NodePort service (which runs only on port 80 and provides no TLS termination natively), we utilize GKE's native Ingress features:
    1. A **Reserved Global Static IP** is provisioned centrally via Terraform.
    2. A `ManagedCertificate` CRD enumerates the exact domain hostnames that must be protected.
    3. An `Ingress` resource creates a Google Cloud HTTP(S) Load Balancer behind the scenes. Using the `kubernetes.io/ingress.global-static-ip-name` annotation alongside the `networking.gke.io/managed-certificates` annotation binds the reserved Terraform IP and newly minted SSL certificate to the `frontend` application service.

### 3. CRM Dashboard (Compute Engine)
**Endpoint:** `crm.gcp-ecommerce-demo.com`

* **Platform:** GCE (Compute VMs).
* **Mechanism:** External HTTP(S) Load Balancer provisioned purely via Terraform.
* **Process:** Since this dashboard runs entirely on native Compute Engine VMs, Terraform explicitly handles the architecture of an L7 Load Balancer.
    1. A `google_compute_managed_ssl_certificate` acts as the certificate authority proxy.
    2. The previous HTTP proxy is upgraded to a `google_compute_target_https_proxy` that attaches the backend URL map and the Google-managed SSL certificate.
    3. The `google_compute_global_forwarding_rule` is mapped to port `443`, directly utilizing the `https_proxy` layer to serve HTTPS traffic exclusively natively.

### 4. CRM Status Page (Direct Compute Engine Binding)
**Endpoint:** `status.crm.gcp-ecommerce-demo.com`

* **Platform:** GCE (Direct IP Attachment).
* **Mechanism:** None (Raw HTTP).
* **Process:** The CRM Status Page points directly to a single VM's regional public external IP address, bypassing any Load Balancing mechanisms. Without an intermediate proxy edge (like an API Gateway or native Load Balancer), Google Cloud cannot automatically terminate an SSL/TLS managed certificate transparently. To secure this endpoint over HTTPS, TLS must be handled either by deploying an additional Cloud Load Balancer in front of it, or manually provisioning a certificate (e.g., Let's Encrypt Certbot) directly onto the VM OS. For demonstration utility, it remains raw HTTP.
