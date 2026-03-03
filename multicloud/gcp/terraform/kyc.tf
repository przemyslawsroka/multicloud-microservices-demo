# kyc.tf - GCP KYC Service Infrastructure

resource "google_compute_network" "kyc_vpc" {
  name                    = "kyc-vpc"
  auto_create_subnetworks = false
  description             = "Dedicated VPC for KYC service"
}

resource "google_compute_subnetwork" "kyc_subnet" {
  name          = "kyc-subnet"
  ip_cidr_range = "10.6.0.0/24"
  region        = "us-central1"
  network       = google_compute_network.kyc_vpc.id
}

resource "google_compute_address" "kyc_static_ip" {
  name         = "kyc-static-ip"
  address_type = "INTERNAL"
  address      = "10.6.0.20"
  region       = "us-central1"
  subnetwork   = google_compute_subnetwork.kyc_subnet.id
}

resource "google_compute_router" "kyc_router" {
  name    = "kyc-router"
  region  = "us-central1"
  network = google_compute_network.kyc_vpc.id
  bgp {
    asn = 64515
  }
}

resource "google_compute_router" "ob_kyc_vpn_router" {
  name    = "ob-kyc-vpn-router"
  region  = "us-central1"
  network = google_compute_network.ob_vpc.id
  bgp {
    asn = 64516
  }
}

resource "google_compute_router_nat" "kyc_nat" {
  name                               = "kyc-nat"
  router                             = google_compute_router.kyc_router.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# HA VPN Setup
resource "google_compute_ha_vpn_gateway" "kyc_gateway" {
  name    = "kyc-vpn-gw"
  network = google_compute_network.kyc_vpc.id
  region  = "us-central1"
}

resource "google_compute_ha_vpn_gateway" "ob_gateway" {
  name    = "ob-vpn-gw-kyc"
  network = google_compute_network.ob_vpc.id
  region  = "us-central1"
}

resource "google_compute_vpn_tunnel" "kyc_to_ob_0" {
  name                  = "kyc-to-ob-tunnel-0"
  region                = "us-central1"
  vpn_gateway           = google_compute_ha_vpn_gateway.kyc_gateway.id
  peer_gcp_gateway      = google_compute_ha_vpn_gateway.ob_gateway.id
  shared_secret         = "secret-key-12345"
  router                = google_compute_router.kyc_router.id
  vpn_gateway_interface = 0
}

resource "google_compute_vpn_tunnel" "kyc_to_ob_1" {
  name                  = "kyc-to-ob-tunnel-1"
  region                = "us-central1"
  vpn_gateway           = google_compute_ha_vpn_gateway.kyc_gateway.id
  peer_gcp_gateway      = google_compute_ha_vpn_gateway.ob_gateway.id
  shared_secret         = "secret-key-12345"
  router                = google_compute_router.kyc_router.id
  vpn_gateway_interface = 1
}

resource "google_compute_vpn_tunnel" "ob_to_kyc_0" {
  name                  = "ob-to-kyc-tunnel-0"
  region                = "us-central1"
  vpn_gateway           = google_compute_ha_vpn_gateway.ob_gateway.id
  peer_gcp_gateway      = google_compute_ha_vpn_gateway.kyc_gateway.id
  shared_secret         = "secret-key-12345"
  router                = google_compute_router.ob_kyc_vpn_router.id
  vpn_gateway_interface = 0
}

resource "google_compute_vpn_tunnel" "ob_to_kyc_1" {
  name                  = "ob-to-kyc-tunnel-1"
  region                = "us-central1"
  vpn_gateway           = google_compute_ha_vpn_gateway.ob_gateway.id
  peer_gcp_gateway      = google_compute_ha_vpn_gateway.kyc_gateway.id
  shared_secret         = "secret-key-12345"
  router                = google_compute_router.ob_kyc_vpn_router.id
  vpn_gateway_interface = 1
}

resource "google_compute_router_interface" "kyc_if0" {
  name       = "kyc-if0"
  router     = google_compute_router.kyc_router.name
  region     = "us-central1"
  ip_range   = "169.254.1.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.kyc_to_ob_0.name
}

resource "google_compute_router_peer" "kyc_peer0" {
  name                      = "kyc-peer0"
  router                    = google_compute_router.kyc_router.name
  region                    = "us-central1"
  peer_ip_address           = "169.254.1.2"
  peer_asn                  = 64516
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.kyc_if0.name
}

resource "google_compute_router_interface" "kyc_if1" {
  name       = "kyc-if1"
  router     = google_compute_router.kyc_router.name
  region     = "us-central1"
  ip_range   = "169.254.2.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.kyc_to_ob_1.name
}

resource "google_compute_router_peer" "kyc_peer1" {
  name                      = "kyc-peer1"
  router                    = google_compute_router.kyc_router.name
  region                    = "us-central1"
  peer_ip_address           = "169.254.2.2"
  peer_asn                  = 64516
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.kyc_if1.name
}

resource "google_compute_router_interface" "ob_if0" {
  name       = "ob-if0"
  router     = google_compute_router.ob_kyc_vpn_router.name
  region     = "us-central1"
  ip_range   = "169.254.1.2/30"
  vpn_tunnel = google_compute_vpn_tunnel.ob_to_kyc_0.name
}

resource "google_compute_router_peer" "ob_peer0" {
  name                      = "ob-peer0"
  router                    = google_compute_router.ob_kyc_vpn_router.name
  region                    = "us-central1"
  peer_ip_address           = "169.254.1.1"
  peer_asn                  = 64515
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.ob_if0.name
}

resource "google_compute_router_interface" "ob_if1" {
  name       = "ob-if1"
  router     = google_compute_router.ob_kyc_vpn_router.name
  region     = "us-central1"
  ip_range   = "169.254.2.2/30"
  vpn_tunnel = google_compute_vpn_tunnel.ob_to_kyc_1.name
}

resource "google_compute_router_peer" "ob_peer1" {
  name                      = "ob-peer1"
  router                    = google_compute_router.ob_kyc_vpn_router.name
  region                    = "us-central1"
  peer_ip_address           = "169.254.2.1"
  peer_asn                  = 64515
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.ob_if1.name
}

resource "google_compute_firewall" "kyc_allow_internal" {
  name    = "kyc-allow-internal"
  network = google_compute_network.kyc_vpc.name
  allow {
    protocol = "tcp"
    ports    = ["8080", "22"]
  }
  allow {
    protocol = "icmp"
  }
  source_ranges = ["10.0.0.0/8"]
}

resource "google_compute_firewall" "ob_allow_vpn_kyc" {
  name    = "ob-allow-vpn-kyc"
  network = google_compute_network.ob_vpc.name
  allow {
    protocol = "tcp"
    ports    = ["8080", "22"]
  }
  allow {
    protocol = "icmp"
  }
  source_ranges = ["10.6.0.0/24"]
}

resource "google_compute_instance" "kyc_vm" {
  name         = "kyc-vm"
  machine_type = "e2-small"
  zone         = "us-central1-a"

  tags = ["kyc-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network    = google_compute_network.kyc_vpc.id
    subnetwork = google_compute_subnetwork.kyc_subnet.id
    network_ip = google_compute_address.kyc_static_ip.address
  }

  metadata_startup_script = file("${path.module}/../kyc-service/startup.sh")

  metadata = {
    app_js       = file("${path.module}/../kyc-service/app.js")
    package_json = file("${path.module}/../kyc-service/package.json")
  }
}
