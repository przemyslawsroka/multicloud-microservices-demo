# out_of_band.tf
# Setup custom packet mirroring using modern network security out-of-band integration.

resource "google_compute_subnetwork" "oob_subnet_us" {
  name          = "oob-collector-subnet-us"
  project       = var.project_id
  region        = "us-central1"
  network       = google_compute_network.crm_vpc.id
  ip_cidr_range = "10.3.2.0/24"
}

resource "google_compute_region_backend_service" "oob_collector_backend" {
  project               = var.project_id
  provider              = google-beta
  name                  = "oob-collector-backend"
  region                = "us-central1"
  health_checks         = [google_compute_health_check.oob_collector_hc.id]
  load_balancing_scheme = "INTERNAL"
  protocol              = "UDP"

  backend {
    group          = google_compute_instance_group.oob_collector_ig.self_link
    balancing_mode = "CONNECTION"
  }
}

resource "google_compute_health_check" "oob_collector_hc" {
  project  = var.project_id
  provider = google-beta
  name     = "oob-collector-hc"
  tcp_health_check {
    port = 80
  }
}

resource "google_compute_forwarding_rule" "oob_collector_ilb" {
  project                = var.project_id
  provider               = google-beta
  name                   = "oob-collector-ilb"
  region                 = "us-central1"
  load_balancing_scheme  = "INTERNAL"
  backend_service        = google_compute_region_backend_service.oob_collector_backend.id
  all_ports              = true
  network                = google_compute_network.crm_vpc.id
  subnetwork             = google_compute_subnetwork.oob_subnet_us.id
  ip_protocol            = "UDP"
  is_mirroring_collector = true
}

# 2. Mirroring Deployment Group
resource "google_network_security_mirroring_deployment_group" "oob_mdg" {
  project                       = var.project_id
  provider                      = google-beta
  mirroring_deployment_group_id = "crm-mdg"
  location                      = "global"
  network                       = google_compute_network.crm_vpc.id
}

# 3. Mirroring Deployment
resource "google_network_security_mirroring_deployment" "oob_md" {
  project                    = var.project_id
  provider                   = google-beta
  mirroring_deployment_id    = "crm-md"
  location                   = "us-central1-f"
  forwarding_rule            = google_compute_forwarding_rule.oob_collector_ilb.id
  mirroring_deployment_group = google_network_security_mirroring_deployment_group.oob_mdg.id
}

# 4. Mirroring Endpoint Group
resource "google_network_security_mirroring_endpoint_group" "oob_meg" {
  project                     = var.project_id
  provider                    = google-beta
  mirroring_endpoint_group_id = "crm-meg"
  location                    = "global"
  mirroring_deployment_group  = google_network_security_mirroring_deployment_group.oob_mdg.id
}

# 5. Mirroring Endpoint Group Association
resource "google_network_security_mirroring_endpoint_group_association" "oob_mega" {
  project                                 = var.project_id
  provider                                = google-beta
  mirroring_endpoint_group_association_id = "crm-mega"
  location                                = "global"
  mirroring_endpoint_group                = google_network_security_mirroring_endpoint_group.oob_meg.id
  network                                 = google_compute_network.ob_vpc.id
}

# ============================================================================
# TRAFFIC COLLECTOR VM (DPI Engine)
# ============================================================================

resource "google_compute_address" "oob_collector_ip" {
  project      = var.project_id
  name         = "oob-collector-ip"
  address_type = "INTERNAL"
  region       = "us-central1"
  subnetwork   = google_compute_subnetwork.oob_subnet_us.id
}

resource "google_compute_instance" "oob_collector_vm" {
  project      = var.project_id
  name         = "traffic-collector-vm"
  machine_type = "e2-small"
  zone         = "us-central1-a"
  tags         = ["oob-collector", "http-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network    = google_compute_network.crm_vpc.id
    subnetwork = google_compute_subnetwork.oob_subnet_us.id
    network_ip = google_compute_address.oob_collector_ip.address
    access_config {} # Give it external IP to download pip/flask easily
  }

  metadata_startup_script = file("${path.module}/../traffic-collector/startup.sh")

  metadata = {
    collector_py = file("${path.module}/../traffic-collector/api/collector.py")
    index_html   = file("${path.module}/../traffic-collector/public/index.html")
    style_css    = file("${path.module}/../traffic-collector/public/style.css")
    app_js       = file("${path.module}/../traffic-collector/public/app.js")
  }
}

resource "google_compute_instance_group" "oob_collector_ig" {
  project   = var.project_id
  name      = "oob-collector-ig"
  zone      = "us-central1-a"
  instances = [google_compute_instance.oob_collector_vm.self_link]
}

# Add a firewall rule to allow OOB LB and Health checks to reach the VM
resource "google_compute_firewall" "allow_oob_collector" {
  project = var.project_id
  name    = "allow-oob-collector"
  network = google_compute_network.crm_vpc.name
  allow {
    protocol = "udp"
    ports    = ["6081"]
  }
  allow {
    protocol = "tcp"
    ports    = ["80", "5000"]
  }
  source_ranges = ["0.0.0.0/0", "130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["oob-collector"]
}

output "traffic_collector_dashboard" {
  value = "http://${google_compute_instance.oob_collector_vm.network_interface.0.access_config.0.nat_ip}:5000"
}

resource "google_network_security_mirroring_deployment" "oob_md_a" {
  project                    = var.project_id
  provider                   = google-beta
  mirroring_deployment_id    = "crm-md-a"
  location                   = "us-central1-a"
  forwarding_rule            = google_compute_forwarding_rule.oob_collector_ilb_a.id
  mirroring_deployment_group = google_network_security_mirroring_deployment_group.oob_mdg.id
}

resource "google_network_security_mirroring_deployment" "oob_md_c" {
  project                    = var.project_id
  provider                   = google-beta
  mirroring_deployment_id    = "crm-md-c"
  location                   = "us-central1-c"
  forwarding_rule            = google_compute_forwarding_rule.oob_collector_ilb_c.id
  mirroring_deployment_group = google_network_security_mirroring_deployment_group.oob_mdg.id
}

resource "google_compute_forwarding_rule" "oob_collector_ilb_a" {
  project                = var.project_id
  provider               = google-beta
  name                   = "oob-collector-ilb-a"
  region                 = "us-central1"
  load_balancing_scheme  = "INTERNAL"
  backend_service        = google_compute_region_backend_service.oob_collector_backend.id
  all_ports              = true
  network                = google_compute_network.crm_vpc.id
  subnetwork             = google_compute_subnetwork.oob_subnet_us.id
  ip_protocol            = "UDP"
  is_mirroring_collector = true
}

resource "google_compute_forwarding_rule" "oob_collector_ilb_b" {
  project                = var.project_id
  provider               = google-beta
  name                   = "oob-collector-ilb-b"
  region                 = "us-central1"
  load_balancing_scheme  = "INTERNAL"
  backend_service        = google_compute_region_backend_service.oob_collector_backend.id
  all_ports              = true
  network                = google_compute_network.crm_vpc.id
  subnetwork             = google_compute_subnetwork.oob_subnet_us.id
  ip_protocol            = "UDP"
  is_mirroring_collector = true
}

resource "google_compute_forwarding_rule" "oob_collector_ilb_c" {
  project                = var.project_id
  provider               = google-beta
  name                   = "oob-collector-ilb-c"
  region                 = "us-central1"
  load_balancing_scheme  = "INTERNAL"
  backend_service        = google_compute_region_backend_service.oob_collector_backend.id
  all_ports              = true
  network                = google_compute_network.crm_vpc.id
  subnetwork             = google_compute_subnetwork.oob_subnet_us.id
  ip_protocol            = "UDP"
  is_mirroring_collector = true
}

resource "google_network_security_mirroring_deployment" "oob_md_b" {
  project                    = var.project_id
  provider                   = google-beta
  mirroring_deployment_id    = "crm-md-b"
  location                   = "us-central1-b"
  forwarding_rule            = google_compute_forwarding_rule.oob_collector_ilb_b.id
  mirroring_deployment_group = google_network_security_mirroring_deployment_group.oob_mdg.id
}


