# developer_portal.tf - Infrastructure for modern Developer Documentation Portal

resource "google_cloud_run_service" "developer_portal" {
  name     = "developer-portal"
  location = "europe-west1"
  project  = var.project_id

  template {
    spec {
      containers {
        # Using a dummy hello image until it's built/pushed through deploy.sh / CI/CD
        image = "us-docker.pkg.dev/cloudrun/container/hello"

        resources {
          limits = {
            memory = "512Mi"
            cpu    = "1"
          }
        }

        ports {
          container_port = 8080
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
    ]
  }

  autogenerate_revision_name = true
}

# Allow public access to the portal
data "google_iam_policy" "noauth_portal" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth_portal" {
  location = google_cloud_run_service.developer_portal.location
  project  = google_cloud_run_service.developer_portal.project
  service  = google_cloud_run_service.developer_portal.name

  policy_data = data.google_iam_policy.noauth_portal.policy_data
}

# Attach external domain to Cloud Run (via DNS verification)
# We map docs.multicloud-demo.example.com to this Cloud Run Service
resource "google_cloud_run_domain_mapping" "docs_domain" {
  name     = "docs.${google_dns_managed_zone.public_zone.dns_name}"
  location = google_cloud_run_service.developer_portal.location
  project  = google_cloud_run_service.developer_portal.project
  metadata {
    namespace = var.project_id
  }
  spec {
    route_name = google_cloud_run_service.developer_portal.name
  }
}

output "portal_url" {
  value = google_cloud_run_service.developer_portal.status[0].url
}
