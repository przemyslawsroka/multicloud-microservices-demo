# dns.tf - Google Cloud DNS Configuration for Internal and External Routing

# Enable Cloud DNS API
resource "google_project_service" "dns_api" {
  service            = "dns.googleapis.com"
  disable_on_destroy = false
}

# ============================================================================
# PRIVATE DNS ZONE (Internal Services)
# ============================================================================
variable "private_domain" {
  description = "The internal domain for services"
  type        = string
  default     = "internal.boutique.local."
}

# Create a private DNS zone for internal traffic
resource "google_dns_managed_zone" "internal_zone" {
  name        = "internal-boutique-zone"
  dns_name    = var.private_domain
  description = "Private DNS zone for internal microservices routing"
  visibility  = "private"

  private_visibility_config {
    # It must be visible to all our VPCs so they can resolve each other natively
    networks {
      network_url = google_compute_network.crm_vpc.id
    }
    networks {
      network_url = google_compute_network.inventory_vpc.id
    }
    networks {
      # Peer Network containing the GKE Cluster
      network_url = google_compute_network.ob_vpc.id
    }
  }

  depends_on = [google_project_service.dns_api]
}

# Record Set: CRM Backend
resource "google_dns_record_set" "crm_backend_record" {
  name         = "crm.${google_dns_managed_zone.internal_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.internal_zone.name
  rrdatas      = [google_compute_address.crm_backend_static_ip.address]
}

# Record Set: Inventory Service (PSC Endpoint)
resource "google_dns_record_set" "inventory_psc_record" {
  name         = "inventory.${google_dns_managed_zone.internal_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.internal_zone.name
  rrdatas      = [google_compute_address.inventory_psc_ip_europe.address]
}

# Record Set: Furniture Service (Legacy VM Simulation)
resource "google_dns_record_set" "furniture_record" {
  name         = "furniture.${google_dns_managed_zone.internal_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.internal_zone.name
  rrdatas      = ["10.5.0.2"]
}

# Record Set: Azure Analytics (via VPN/Interconnect Simulation)
resource "google_dns_record_set" "azure_analytics_record" {
  name         = "analytics.azure.${google_dns_managed_zone.internal_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.internal_zone.name
  rrdatas      = ["10.2.1.5"]
}

# ============================================================================
# PUBLIC DNS ZONE (External Customers & B2B)
# ============================================================================
variable "public_domain" {
  description = "The registered public domain for the demonstration"
  type        = string
  default     = "gcp-ecommerce-demo.com."
}

# Use automatically created public DNS zone for internet-facing traffic
data "google_dns_managed_zone" "public_zone" {
  name = "gcp-ecommerce-demo-com"
}

# Record Set: CRM Status Page (Direct Public VM Access)
resource "google_dns_record_set" "crm_status_public_record" {
  name         = "status.crm.${data.google_dns_managed_zone.public_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.public_zone.name
  rrdatas      = [google_compute_address.crm_status_external_ip.address]
}

# Record Set: CRM Frontend (L7 External Load Balancer)
resource "google_dns_record_set" "crm_frontend_public_record" {
  name         = "crm.${data.google_dns_managed_zone.public_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.public_zone.name
  rrdatas      = [google_compute_global_address.crm_frontend_ip.address]
}

# Reserve a global static IP for the Online Boutique GKE Ingress
resource "google_compute_global_address" "boutique_frontend_ip" {
  name = "boutique-frontend-ingress-ip"
}

# Record Set: Online Boutique (Apex)
resource "google_dns_record_set" "boutique_apex_record" {
  name         = data.google_dns_managed_zone.public_zone.dns_name
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.public_zone.name
  # Uses the Reserved Global IP allocated above for GKE Ingress
  rrdatas = [google_compute_global_address.boutique_frontend_ip.address]
}

# Record Set: Online Boutique (WWW)
resource "google_dns_record_set" "boutique_www_record" {
  name         = "www.${data.google_dns_managed_zone.public_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.public_zone.name
  rrdatas      = [google_compute_global_address.boutique_frontend_ip.address]
}

# Record Set: Documentation Portal
resource "google_dns_record_set" "docs_public_record" {
  name         = "docs.${data.google_dns_managed_zone.public_zone.dns_name}"
  type         = "CNAME"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.public_zone.name
  # Documentation portal domain mapping is targeted to Cloud Run
  rrdatas = ["ghs.googlehosted.com."]
}

# Record Set: Traffic Collector Dashboard
resource "google_dns_record_set" "traffic_collector_record" {
  name         = "traffic.${data.google_dns_managed_zone.public_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.public_zone.name
  rrdatas      = [google_compute_address.oob_collector_external_ip.address]
}

# ============================================================================
# CERTIFICATE MANAGER (GKE GATEWAY)
# ============================================================================
resource "google_project_service" "cert_manager_api" {
  service            = "certificatemanager.googleapis.com"
  disable_on_destroy = false
}
resource "google_certificate_manager_certificate" "boutique_cert" {
  name        = "boutique-managed-cert"
  description = "Managed certificate for Online Boutique Gateway"
  managed {
    domains = [
      trimsuffix(data.google_dns_managed_zone.public_zone.dns_name, "."),
      "www.${trimsuffix(data.google_dns_managed_zone.public_zone.dns_name, ".")}"
    ]
  }
}

resource "google_certificate_manager_certificate_map" "boutique_cert_map" {
  name = "boutique-cert-map"
}

resource "google_certificate_manager_certificate_map_entry" "boutique_cert_map_entry_apex" {
  name         = "entry-apex"
  map          = google_certificate_manager_certificate_map.boutique_cert_map.name
  certificates = [google_certificate_manager_certificate.boutique_cert.id]
  hostname     = trimsuffix(data.google_dns_managed_zone.public_zone.dns_name, ".")
}

resource "google_certificate_manager_certificate_map_entry" "boutique_cert_map_entry_www" {
  name         = "entry-www"
  map          = google_certificate_manager_certificate_map.boutique_cert_map.name
  certificates = [google_certificate_manager_certificate.boutique_cert.id]
  hostname     = "www.${trimsuffix(data.google_dns_managed_zone.public_zone.dns_name, ".")}"
}
