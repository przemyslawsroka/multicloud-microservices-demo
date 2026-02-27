# ordermanagement.tf - GCP Order Management System (Cloud Run) in Australia

# Enable necessary APIs
resource "google_project_service" "ordermanagement_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "eventarc.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Create Artifact Registry repository for ordermanagement service
resource "google_artifact_registry_repository" "ordermanagement_repo" {
  location      = "australia-southeast1" # Sydney
  repository_id = "ordermanagement-repo"
  description   = "Docker repository for ordermanagement service"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.ordermanagement_apis]
}

# Create a service account to act as the Eventarc trigger identity
resource "google_service_account" "eventarc_trigger_sa" {
  account_id   = "eventarc-trigger-sa"
  display_name = "Eventarc Trigger Service Account"
  project      = var.project_id
}

# Grant Eventarc SA permission to invoke Cloud Run
resource "google_project_iam_member" "eventarc_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.eventarc_trigger_sa.email}"
}

# Define the Cloud Run service for OrderManagement
resource "google_cloud_run_v2_service" "ordermanagement_api_service" {
  name     = "ordermanagement-api-service"
  location = "australia-southeast1"
  project  = var.project_id

  template {
    containers {
      image = "australia-southeast1-docker.pkg.dev/${var.project_id}/ordermanagement-repo/ordermanagement-service:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "ACCOUNTING_SERVICE_URL"
        value = "" # To be provided or fetched
      }
      env {
        name  = "WAREHOUSE_SERVICE_URL"
        value = "" # To be provided or fetched
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
    google_project_service.ordermanagement_apis,
    google_artifact_registry_repository.ordermanagement_repo
  ]
}

# Create Eventarc trigger from Pub/Sub topic to Cloud Run
# Using Eventarc to trigger Cloud Run upon Pub/Sub message
resource "google_eventarc_trigger" "order_events_trigger" {
  name     = "order-events-trigger"
  location = "australia-southeast1"
  project  = var.project_id

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.pubsub.topic.v1.messagePublished"
  }

  # Trigger depends on the pubsub topic existing globally
  transport {
    pubsub {
      topic = google_pubsub_topic.order_events_topic.id
    }
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.ordermanagement_api_service.name
      region  = "australia-southeast1"
    }
  }

  service_account = google_service_account.eventarc_trigger_sa.email

  depends_on = [
    google_project_iam_member.eventarc_run_invoker,
    google_pubsub_topic.order_events_topic
  ]
}

output "ordermanagement_service_url" {
  description = "The URL of the deployed Cloud Run OrderManagement service"
  value       = google_cloud_run_v2_service.ordermanagement_api_service.uri
}
