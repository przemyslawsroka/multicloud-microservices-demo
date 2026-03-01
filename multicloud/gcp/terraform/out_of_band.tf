# out_of_band.tf
# Setup custom packet mirroring using modern network security out-of-band integration.

# 1. Collector ILB Forwarding Rule (dummy backend for demonstration)
resource "google_compute_region_backend_service" "oob_collector_backend" {
  project = var.project_id
  provider              = google-beta
  name                  = "oob-collector-backend"
  region                = "asia-east1"
  health_checks         = [google_compute_health_check.oob_collector_hc.id]
  load_balancing_scheme = "INTERNAL"
  protocol              = "UDP"
}

resource "google_compute_health_check" "oob_collector_hc" {
  project = var.project_id
  provider = google-beta
  name     = "oob-collector-hc"
  tcp_health_check {
    port = 80
  }
}

resource "google_compute_forwarding_rule" "oob_collector_ilb" {
  project = var.project_id
  provider              = google-beta
  name                  = "oob-collector-ilb"
  region                = "asia-east1"
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.oob_collector_backend.id
  all_ports             = true
  network               = google_compute_network.crm_vpc.id
  subnetwork             = google_compute_subnetwork.crm_subnet.id
  ip_protocol            = "UDP"
  is_mirroring_collector = true
}

# 2. Mirroring Deployment Group
resource "google_network_security_mirroring_deployment_group" "oob_mdg" {
  project = var.project_id
  provider                      = google-beta
  mirroring_deployment_group_id = "crm-mdg"
  location                      = "global"
  network                       = google_compute_network.crm_vpc.id
}

# 3. Mirroring Deployment
resource "google_network_security_mirroring_deployment" "oob_md" {
  project = var.project_id
  provider                   = google-beta
  mirroring_deployment_id    = "crm-md"
  location                   = "asia-east1-a"
  forwarding_rule            = google_compute_forwarding_rule.oob_collector_ilb.id
  mirroring_deployment_group = google_network_security_mirroring_deployment_group.oob_mdg.id
}

# 4. Mirroring Endpoint Group
resource "google_network_security_mirroring_endpoint_group" "oob_meg" {
  project = var.project_id
  provider                    = google-beta
  mirroring_endpoint_group_id = "crm-meg"
  location                    = "global"
  mirroring_deployment_group  = google_network_security_mirroring_deployment_group.oob_mdg.id
}

# 5. Mirroring Endpoint Group Association
resource "google_network_security_mirroring_endpoint_group_association" "oob_mega" {
  project = var.project_id
  provider                                = google-beta
  mirroring_endpoint_group_association_id = "crm-mega"
  location                                = "global"
  mirroring_endpoint_group                = google_network_security_mirroring_endpoint_group.oob_meg.id
  network                                 = google_compute_network.inventory_vpc.id
}

# # 6. Security Profile
# resource "google_network_security_security_profile" "oob_sp" {
#   parent   = "projects/${var.project_id}"
#   provider = google-beta
#   name     = "crm-mirroring-profile"
#   location = "global"
#   type     = "CUSTOM_MIRRORING"
#   custom_mirroring_profile {
#     mirroring_endpoint_group = google_network_security_mirroring_endpoint_group.oob_meg.id
#   }
# }
# 
# # 7. Security Profile Group
# resource "google_network_security_security_profile_group" "oob_spg" {
#   provider                 = google-beta
#   name                     = "crm-mirroring-spg"
#   location                 = "global"
#   custom_mirroring_profile = google_network_security_security_profile.oob_sp.id
# }
# 
# # 8. Network Firewall Policy
# resource "google_compute_network_firewall_policy" "oob_policy" {
#   project = var.project_id
#   provider    = google-beta
#   name        = "crm-mirroring-policy"
#   description = "Global mirroring policy for CRM VPC"
# }
# 
# # 9. Firewall Policy Rule (Mirroring all traffic to CRM Backend VM)
# resource "google_compute_network_firewall_policy_rule" "oob_rule" {
#   project = var.project_id
#   provider               = google-beta
#   firewall_policy        = google_compute_network_firewall_policy.oob_policy.name
#   rule_name              = "mirror-crm-backend"
#   priority               = 1000
#   action                 = "mirror"
#   direction              = "INGRESS"
#   security_profile_group = google_network_security_security_profile_group.oob_spg.id
# 
#   match {
#     dest_ip_ranges = [google_compute_address.crm_backend_static_ip.address]
#     layer4_configs {
#       ip_protocol = "all"
#     }
#   }
# }
# 
# # 10. Policy Association
# resource "google_compute_network_firewall_policy_association" "oob_policy_assoc" {
#   project = var.project_id
#   provider          = google-beta
#   name              = "crm-mirroring-assoc"
#   firewall_policy   = google_compute_network_firewall_policy.oob_policy.name
#   attachment_target = google_compute_network.crm_vpc.id
# }
