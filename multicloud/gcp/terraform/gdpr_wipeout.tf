# gdpr_wipeout.tf - Cloud Run Job for CRM GDPR Data Wipeout

# Enable required APIs for Cloud Run Jobs if not already enabled
resource "google_project_service" "gdpr_wipeout_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "cloudscheduler.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "crm_jobs_repo" {
  location      = "asia-east1"
  repository_id = "crm-jobs-repo"
  description   = "Docker repository for CRM jobs like GDPR wipeout"
  format        = "DOCKER"
  project       = var.project_id

  depends_on = [google_project_service.gdpr_wipeout_apis]
}

# The Cloud Run job that deletes records older than 3 hours
resource "google_cloud_run_v2_job" "gdpr_wipeout_job" {
  name     = "crm-gdpr-wipeout"
  location = "asia-east1"
  project  = var.project_id

  template {
    template {
      containers {
        # Note: You need to build and push the image first:
        # cd multicloud/gcp/gdpr-wipeout && gcloud builds submit --config=cloudbuild.yaml
        image = "asia-east1-docker.pkg.dev/${var.project_id}/crm-jobs-repo/gdpr-wipeout:latest"

        env {
          name  = "DB_HOST"
          value = google_compute_address.crm_db_psc_ip.address
        }
        env {
          name  = "DB_USER"
          value = google_sql_user.crm_user.name
        }
        env {
          name  = "DB_PASS"
          value = random_password.crm_db_password.result
        }
      }

      vpc_access {
        network_interfaces {
          network    = google_compute_network.crm_vpc.id
          subnetwork = google_compute_subnetwork.crm_subnet.id
        }
        egress = "PRIVATE_RANGES_ONLY"
      }
    }
  }

  depends_on = [
    google_project_service.gdpr_wipeout_apis,
    google_artifact_registry_repository.crm_jobs_repo
  ]
}

# Service account for Cloud Scheduler to invoke the Cloud Run Job
resource "google_service_account" "gdpr_wipeout_invoker" {
  account_id   = "gdpr-wipeout-invoker"
  display_name = "Cloud Scheduler SA for GDPR Wipeout"
  project      = var.project_id
}

# Grant the service account permissions to invoke the job
resource "google_cloud_run_v2_job_iam_member" "gdpr_wipeout_invoker_binding" {
  project  = google_cloud_run_v2_job.gdpr_wipeout_job.project
  location = google_cloud_run_v2_job.gdpr_wipeout_job.location
  name     = google_cloud_run_v2_job.gdpr_wipeout_job.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.gdpr_wipeout_invoker.email}"
}

# Cloud Scheduler job to run every hour
resource "google_cloud_scheduler_job" "gdpr_wipeout_schedule" {
  name        = "crm-gdpr-wipeout-schedule"
  description = "Trigger GDPR wipeout job every hour"
  schedule    = "0 * * * *"
  time_zone   = "UTC"
  region      = "asia-east1"
  project     = var.project_id

  retry_config {
    retry_count = 3
  }

  http_target {
    http_method = "POST"
    uri         = "https://${google_cloud_run_v2_job.gdpr_wipeout_job.location}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.gdpr_wipeout_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.gdpr_wipeout_invoker.email
    }
  }

  depends_on = [
    google_project_service.gdpr_wipeout_apis
  ]
}
