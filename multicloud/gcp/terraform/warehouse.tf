# warehouse.tf - GCP Warehouse Service Cloud Run Infrastructure

# Enable necessary APIs
resource "google_project_service" "warehouse_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Create Artifact Registry repository for warehouse service
resource "google_artifact_registry_repository" "warehouse_repo" {
  location      = "europe-west1"
  repository_id = "warehouse-repo"
  description   = "Docker repository for warehouse service"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.warehouse_apis]
}

# Reference to the inventory VPC network
data "google_compute_network" "inventory_vpc" {
  name    = "inventory-vpc"
  project = var.project_id
}

# Reference to the inventory subnet
data "google_compute_subnetwork" "inventory_subnet" {
  name    = "inventory-subnet"
  region  = "europe-west1"
  project = var.project_id
}

# Firewall rule to allow Cloud Run to access inventory service
resource "google_compute_firewall" "allow_cloud_run_to_inventory" {
  name    = "allow-cloud-run-to-inventory"
  network = data.google_compute_network.inventory_vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  # Cloud Run uses these IP ranges when using Direct VPC egress
  source_ranges = ["10.1.0.0/24"]
  target_tags   = ["inventory-server"]

  description = "Allow Cloud Run warehouse service to access inventory service"

  depends_on = [google_project_service.warehouse_apis]
}

# Define the Cloud Run service
resource "google_cloud_run_v2_service" "warehouse_api_service" {
  name                = "warehouse-api-service"
  location            = "europe-west1"
  project             = var.project_id
  deletion_protection = false

  template {
    containers {
      # Note: You need to build and push the image first using:
      # cd multicloud/gcp/warehouse-service && gcloud builds submit --config=cloudbuild.yaml
      image = "europe-west1-docker.pkg.dev/${var.project_id}/warehouse-repo/warehouse-service:latest"

      ports {
        container_port = 8080
      }

      # Environment variables
      env {
        name  = "INVENTORY_SERVICE_URL"
        value = var.inventory_service_url
      }

      # Resource limits
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    # Scaling configuration
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    # Direct VPC egress configuration for accessing inventory service
    vpc_access {
      # Use Direct VPC egress (recommended over VPC connector)
      network_interfaces {
        network    = data.google_compute_network.inventory_vpc.id
        subnetwork = data.google_compute_subnetwork.inventory_subnet.id
      }
      # Route only private ranges through VPC (more efficient)
      egress = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.warehouse_apis,
    google_artifact_registry_repository.warehouse_repo
  ]
}

# Allow unauthenticated access to the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "warehouse_noauth" {
  name     = google_cloud_run_v2_service.warehouse_api_service.name
  location = google_cloud_run_v2_service.warehouse_api_service.location
  project  = google_cloud_run_v2_service.warehouse_api_service.project
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [google_cloud_run_v2_service.warehouse_api_service]
}

# Output the URL of the deployed service
output "warehouse_service_url" {
  description = "The URL of the deployed Cloud Run warehouse service"
  value       = google_cloud_run_v2_service.warehouse_api_service.uri
}

output "warehouse_artifact_registry" {
  description = "The Artifact Registry repository for warehouse service"
  value       = google_artifact_registry_repository.warehouse_repo.id
}

output "warehouse_vpc_config" {
  description = "VPC configuration for warehouse service"
  value = {
    network    = data.google_compute_network.inventory_vpc.name
    subnetwork = data.google_compute_subnetwork.inventory_subnet.name
    region     = "europe-west1"
  }
}
