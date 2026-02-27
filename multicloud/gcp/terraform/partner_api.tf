# partner_api.tf - GCP Partner API Service (Cloud Run) in Europe West

# Enable API
resource "google_project_service" "partner_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Create Artifact Registry repository
resource "google_artifact_registry_repository" "partner_repo" {
  location      = "europe-west3" # Frankfurt
  repository_id = "partner-api-repo"
  description   = "Docker repository for Partner API service"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.partner_apis]
}

# Define the Cloud Run service for Partner API
resource "google_cloud_run_v2_service" "partner_api_service" {
  name     = "partner-api-service"
  location = "europe-west3"
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY" # Only internal traffic (e.g. from API Gateway via Serverless NEG)

  template {
    containers {
      image = "europe-west3-docker.pkg.dev/${var.project_id}/partner-api-repo/partner-api-service:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  depends_on = [
    google_project_service.partner_apis,
    google_artifact_registry_repository.partner_repo
  ]
}

# Allow internal components to invoke
resource "google_cloud_run_v2_service_iam_member" "partner_internal" {
  name     = google_cloud_run_v2_service.partner_api_service.name
  location = google_cloud_run_v2_service.partner_api_service.location
  project  = google_cloud_run_v2_service.partner_api_service.project
  role     = "roles/run.invoker"
  member   = "allUsers" # API gateway intercepts, but internal ingress protects it anyway

  depends_on = [google_cloud_run_v2_service.partner_api_service]
}

output "partner_api_service_url" {
  description = "The internal URL of the deployed Cloud Run Partner API service"
  value       = google_cloud_run_v2_service.partner_api_service.uri
}
