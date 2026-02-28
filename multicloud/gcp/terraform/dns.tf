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
      network_url = "projects/${var.project_id}/global/networks/online-boutique-vpc"
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
  default     = "multicloud-demo.example.com."
}

# Create a public DNS zone for internet-facing traffic
resource "google_dns_managed_zone" "public_zone" {
  name        = "public-boutique-zone"
  dns_name    = var.public_domain
  description = "Public DNS zone for external traffic to Apigee, GKE, and public VMs"
  visibility  = "public"

  depends_on = [google_project_service.dns_api]
}

# Record Set: CRM Status Page (Direct Public VM Access)
resource "google_dns_record_set" "crm_status_public_record" {
  name         = "status.crm.${google_dns_managed_zone.public_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.public_zone.name
  rrdatas      = [google_compute_address.crm_status_external_ip.address]
}

# Record Set: CRM Frontend (L7 External Load Balancer)
resource "google_dns_record_set" "crm_frontend_public_record" {
  name         = "crm.${google_dns_managed_zone.public_zone.dns_name}"
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.public_zone.name
  rrdatas      = [google_compute_global_address.crm_frontend_ip.address]
}
