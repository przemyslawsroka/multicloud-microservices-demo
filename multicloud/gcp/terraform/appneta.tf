# -----------------------------------------------------------------------------------
# AppNeta Monitoring Point for hybrid-vpc
# -----------------------------------------------------------------------------------

# 1. Firewall rules based on Broadcom/AppNeta requirements
# https://techdocs.broadcom.com/us/en/ca-enterprise-software/it-operations-management/appneta-for-google-cloud-network-insights/GA/appliance-firewall.html

resource "google_compute_firewall" "allow_appneta_icmp" {
  name    = "allow-appneta-icmp"
  network = google_compute_network.hybrid_vpc.id

  # Required ICMP packets for correct path tracing (echo, echo-reply, time-exceeded, etc.)
  # GCP's "icmp" protocol inherently covers the standard v4 ICMP tracing required by AppNeta.
  allow {
    protocol = "icmp"
  }
  
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["appneta-mp"]
}

resource "google_compute_firewall" "allow_appneta_tcp" {
  name    = "allow-appneta-tcp"
  network = google_compute_network.hybrid_vpc.id

  allow {
    protocol = "tcp"
    ports    = ["443", "3236", "3238"] 
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["appneta-mp"]
}

resource "google_compute_firewall" "allow_appneta_udp" {
  name    = "allow-appneta-udp"
  network = google_compute_network.hybrid_vpc.id

  allow {
    protocol = "udp"
    ports    = ["7", "1720", "3236", "3237", "3238", "3239", "5060", "33434", "49150"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["appneta-mp"]
}

# -----------------------------------------------------------------------------------
# 2. The Compute Engine Instance
# -----------------------------------------------------------------------------------

resource "google_compute_instance" "monitoring_point" {
  name         = "monitoring-point-hybrid-vpc"
  machine_type = "e2-medium"
  zone         = "${var.region}-a"

  tags = ["appneta-mp"]

  boot_disk {
    initialize_params {
      # AppNeta works best on standard Linux 
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 20
    }
  }

  network_interface {
    network    = google_compute_network.hybrid_vpc.id
    subnetwork = google_compute_subnetwork.hybrid_subnet.id
    
    # Adding an ephemeral public IP so you can reach out to data.<region>.cni.appneta.com 
    # to register the point and download the container without needing Cloud NAT setup.
    access_config {
      // Ephemeral public IP
    }
  }
}
