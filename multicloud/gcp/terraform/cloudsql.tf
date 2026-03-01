# cloudsql.tf - CRM Managed MySQL Database with Private Service Connect (PSC)

# Suffix to ensure unique instance names
resource "random_id" "db_name_suffix" {
  byte_length = 4
}

# Enable Cloud SQL Admin API
resource "google_project_service" "sqladmin_api" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

# Enable Service Networking API
resource "google_project_service" "servicenetworking_api" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

# 1. Create Cloud SQL MySQL Instance with PSC Enabled
resource "google_sql_database_instance" "crm_db" {
  name             = "crm-db-instance-${random_id.db_name_suffix.hex}"
  region           = "asia-east1" # Must match the CRM VPC subnet region
  database_version = "MYSQL_8_0"

  settings {
    tier = "db-f1-micro" # Lightweight development tier

    ip_configuration {
      ipv4_enabled = false # No public IP

      # Enable Private Service Connect
      psc_config {
        psc_enabled               = true
        allowed_consumer_projects = [var.project_id]
      }
    }
  }

  depends_on = [
    google_project_service.sqladmin_api,
    google_project_service.servicenetworking_api
  ]
}

# 2. Database within the instance
resource "google_sql_database" "crm_database" {
  name     = "crm"
  instance = google_sql_database_instance.crm_db.name
}

# 3. Create a Random Password
resource "random_password" "crm_db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# 4. Database User
resource "google_sql_user" "crm_user" {
  name     = "crm_user"
  instance = google_sql_database_instance.crm_db.name
  password = random_password.crm_db_password.result
}

# 5. Reserve an internal IP for the PSC Endpoint in CRM VPC
resource "google_compute_address" "crm_db_psc_ip" {
  name         = "crm-db-psc-ip"
  region       = "asia-east1"
  subnetwork   = google_compute_subnetwork.crm_subnet.id
  address_type = "INTERNAL"
  address      = "10.3.0.200" # Reserved static IP inside crm_subnet specifically for the DB
}

# 6. Create the PSC Forwarding Rule pointing to Cloud SQL
resource "google_compute_forwarding_rule" "crm_db_psc_rule" {
  name                  = "crm-db-psc-forwarding-rule"
  region                = "asia-east1"
  network               = google_compute_network.crm_vpc.id
  subnetwork            = google_compute_subnetwork.crm_subnet.id
  target                = google_sql_database_instance.crm_db.psc_service_attachment_link
  ip_address            = google_compute_address.crm_db_psc_ip.id
  load_balancing_scheme = ""
}

# Outputs to verify Database connection
output "crm_db_psc_endpoint" {
  value       = google_compute_address.crm_db_psc_ip.address
  description = "The internal IP address for reaching Cloud SQL from CRM VPC via PSC"
}

output "crm_db_user" {
  value       = google_sql_user.crm_user.name
  description = "Cloud SQL master user"
}

output "crm_db_password" {
  value       = random_password.crm_db_password.result
  sensitive   = true
  description = "Cloud SQL generated password (use terraform output -raw crm_db_password to view)"
}
