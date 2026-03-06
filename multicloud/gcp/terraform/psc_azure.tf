# -----------------------------------------------------------------------------------
# 1. PSC Infrastructure Subnets in hybrid-vpc
# -----------------------------------------------------------------------------------

# The Proxy-only subnet enables the Internal TCP Proxy to run serverlessly
resource "google_compute_subnetwork" "hybrid_proxy_subnet" {
  name          = "hybrid-proxy-subnet"
  ip_cidr_range = "10.250.2.0/24"
  region        = var.region
  network       = google_compute_network.hybrid_vpc.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

# The PSC NAT subnet masks the overlapping IPs from online-boutique-vpc
resource "google_compute_subnetwork" "hybrid_psc_nat_subnet" {
  name          = "hybrid-psc-nat-subnet"
  ip_cidr_range = "10.250.3.0/24"
  region        = var.region
  network       = google_compute_network.hybrid_vpc.id
  purpose       = "PRIVATE_SERVICE_CONNECT"
}

# -----------------------------------------------------------------------------------
# 2. Hybrid NEGs to target the Azure VM (10.2.1.5)
# Note: L4 TCP Proxies require a strict 1-to-1 port mapping to the external IP. 
# We create one pipeline for HTTP (80) and one for HTTP 8080 (443).
# -----------------------------------------------------------------------------------

# HTTP NEG (Port 80)
resource "google_compute_network_endpoint_group" "azure_http_neg" {
  name                  = "azure-http-neg"
  network               = google_compute_network.hybrid_vpc.id
  network_endpoint_type = "NON_GCP_PRIVATE_IP_PORT"
  default_port          = 80
  zone                  = "${var.region}-a"
}

resource "google_compute_network_endpoint" "azure_http_endpoint" {
  network_endpoint_group = google_compute_network_endpoint_group.azure_http_neg.name
  port                   = 80
  ip_address             = "10.2.1.5" # The Azure VM
  zone                   = "${var.region}-a"
}

# HTTP 8080 NEG (Port 443)
resource "google_compute_network_endpoint_group" "azure_http8080_neg" {
  name                  = "azure-http8080-neg"
  network               = google_compute_network.hybrid_vpc.id
  network_endpoint_type = "NON_GCP_PRIVATE_IP_PORT"
  default_port          = 8080
  zone                  = "${var.region}-a"
}

resource "google_compute_network_endpoint" "azure_http8080_endpoint" {
  network_endpoint_group = google_compute_network_endpoint_group.azure_http8080_neg.name
  port                   = 8080
  ip_address             = "10.2.1.5" # The Azure VM
  zone                   = "${var.region}-a"
}

# -----------------------------------------------------------------------------------
# 3. Health Checks & Backend Services
# -----------------------------------------------------------------------------------

resource "google_compute_region_health_check" "azure_http_hc" {
  name   = "azure-http-hc"
  region = var.region
  tcp_health_check {
    port = 80
  }
}

resource "google_compute_region_health_check" "azure_http8080_hc" {
  name   = "azure-http8080-hc"
  region = var.region
  tcp_health_check {
    port = 8080
  }
}

resource "google_compute_region_backend_service" "azure_http_backend" {
  name                  = "azure-http-backend"
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  health_checks         = [google_compute_region_health_check.azure_http_hc.id]
  backend {
    group = google_compute_network_endpoint_group.azure_http_neg.id
  }
}

resource "google_compute_region_backend_service" "azure_http8080_backend" {
  name                  = "azure-http8080-backend"
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  health_checks         = [google_compute_region_health_check.azure_http8080_hc.id]
  backend {
    group = google_compute_network_endpoint_group.azure_http8080_neg.id
  }
}

# -----------------------------------------------------------------------------------
# 4. TCP Proxies & Internal Load Balancers in hybrid-vpc
# -----------------------------------------------------------------------------------

resource "google_compute_region_target_tcp_proxy" "azure_http_proxy" {
  name             = "azure-http-proxy"
  region           = var.region
  backend_service  = google_compute_region_backend_service.azure_http_backend.id
}

resource "google_compute_region_target_tcp_proxy" "azure_http8080_proxy" {
  name             = "azure-http8080-proxy"
  region           = var.region
  backend_service  = google_compute_region_backend_service.azure_http8080_backend.id
}

resource "google_compute_forwarding_rule" "azure_http_ilb" {
  name                  = "azure-http-ilb"
  region                = var.region
  network               = google_compute_network.hybrid_vpc.id
  subnetwork            = google_compute_subnetwork.hybrid_subnet.id
  load_balancing_scheme = "INTERNAL_MANAGED"
  port_range            = "80"
  target                = google_compute_region_target_tcp_proxy.azure_http_proxy.id
  depends_on            = [google_compute_subnetwork.hybrid_proxy_subnet]
}

resource "google_compute_forwarding_rule" "azure_http8080_ilb" {
  name                  = "azure-http8080-ilb"
  region                = var.region
  network               = google_compute_network.hybrid_vpc.id
  subnetwork            = google_compute_subnetwork.hybrid_subnet.id
  load_balancing_scheme = "INTERNAL_MANAGED"
  port_range            = "80"
  target                = google_compute_region_target_tcp_proxy.azure_http8080_proxy.id
  depends_on            = [google_compute_subnetwork.hybrid_proxy_subnet]
}

# -----------------------------------------------------------------------------------
# 5. Publish the Service Attachments in hybrid-vpc
# -----------------------------------------------------------------------------------

resource "google_compute_service_attachment" "azure_http_sa" {
  name                  = "azure-http-sa"
  region                = var.region
  enable_proxy_protocol = false
  connection_preference = "ACCEPT_AUTOMATIC"
  nat_subnets           = [google_compute_subnetwork.hybrid_psc_nat_subnet.id]
  target_service        = google_compute_forwarding_rule.azure_http_ilb.id
}

resource "google_compute_service_attachment" "azure_http8080_sa" {
  name                  = "azure-http8080-sa"
  region                = var.region
  enable_proxy_protocol = false
  connection_preference = "ACCEPT_AUTOMATIC"
  nat_subnets           = [google_compute_subnetwork.hybrid_psc_nat_subnet.id]
  target_service        = google_compute_forwarding_rule.azure_http8080_ilb.id
}

# -----------------------------------------------------------------------------------
# 6. Consume the services in online-boutique-vpc via PSC Endpoints
# -----------------------------------------------------------------------------------

# Reserves a specific IP in your online-boutique-vpc for the HTTP traffic
resource "google_compute_address" "azure_http_psc_ip" {
  name         = "azure-http-psc-ip"
  subnetwork   = "projects/${var.project_id}/regions/${var.region}/subnetworks/online-boutique-vpc" # Standard subnetwork from online-boutique
  address_type = "INTERNAL"
  region       = var.region
  # The IP address inside your overlapping 10.128.0.0/20 block your pods will talk to
  address      = "10.128.0.50" 
}

# The magical bridge linking 10.128.0.50 directly to Azure's port 80
resource "google_compute_forwarding_rule" "azure_http_psc_endpoint" {
  name                  = "azure-http-psc-endpoint"
  region                = var.region
  network               = "projects/${var.project_id}/global/networks/online-boutique-vpc"
  ip_address            = google_compute_address.azure_http_psc_ip.id
  load_balancing_scheme = ""
  target                = google_compute_service_attachment.azure_http_sa.id
}

# Reserves a specific IP in your online-boutique-vpc for the HTTP 8080 traffic
resource "google_compute_address" "azure_http8080_psc_ip" {
  name         = "azure-http8080-psc-ip"
  subnetwork   = "projects/${var.project_id}/regions/${var.region}/subnetworks/online-boutique-vpc"
  address_type = "INTERNAL"
  region       = var.region
  address      = "10.128.0.51" 
}

resource "google_compute_forwarding_rule" "azure_http8080_psc_endpoint" {
  name                  = "azure-http8080-psc-endpoint"
  region                = var.region
  network               = "projects/${var.project_id}/global/networks/online-boutique-vpc"
  ip_address            = google_compute_address.azure_http8080_psc_ip.id
  load_balancing_scheme = ""
  target                = google_compute_service_attachment.azure_http8080_sa.id
}
