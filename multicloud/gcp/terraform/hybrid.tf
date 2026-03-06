# -----------------------------------------------------------------------------------
# 1. Create the Hybrid VPC Network
# -----------------------------------------------------------------------------------
resource "google_compute_network" "hybrid_vpc" {
  name                    = "hybrid-vpc"
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

# -----------------------------------------------------------------------------------
# 2. Create the unique subnet for the Hybrid VPC
# -----------------------------------------------------------------------------------
resource "google_compute_subnetwork" "hybrid_subnet" {
  name          = "hybrid-subnet"
  ip_cidr_range = "10.250.0.0/24" # Non-overlapping IP range
  region        = var.region
  network       = google_compute_network.hybrid_vpc.id
  
  # Optional: Enable Private Google Access if your proxy/hybrid VMs need it
  private_ip_google_access = true
}

# -----------------------------------------------------------------------------------
# 3. Peering from hybrid-vpc to the Central Network (cci-dev-playground)
# -----------------------------------------------------------------------------------
resource "google_compute_network_peering" "hybrid_to_central_peering" {
  name         = "hybrid-to-central-peering"
  network      = google_compute_network.hybrid_vpc.id
  peer_network = "projects/cci-dev-playground/global/networks/location-verification"

  # We import custom routes so hybrid-vpc knows how to reach Azure via the Interconnect
  import_custom_routes = true
  export_custom_routes = false 
}

# -----------------------------------------------------------------------------------
# 4. Peering from the Central Network (cci-dev-playground) to hybrid-vpc
# (Requires Compute Admin / Network Admin in cci-dev-playground)
# -----------------------------------------------------------------------------------
resource "google_compute_network_peering" "central_to_hybrid_peering" {
  name         = "central-to-hybrid-peering"
  network      = "projects/cci-dev-playground/global/networks/location-verification"
  peer_network = google_compute_network.hybrid_vpc.id

  # We don't necessarily need to import Azure routes back into Azure, 
  # but we export the hybrid-vpc routes so the central route table learns about 10.250.0.0/24
  import_custom_routes = false
  export_custom_routes = true
}
