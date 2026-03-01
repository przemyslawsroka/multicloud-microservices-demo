# apigee.tf - GCP API Gateway Config (Simulating Apigee B2B Gateway)

# Enable necessary APIs
resource "google_project_service" "apigateway_apis" {
  for_each = toset([
    "apigateway.googleapis.com",
    "servicecontrol.googleapis.com",
    "servicemanagement.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Create a service account for API Gateway to invoke backend
resource "google_service_account" "apigw_sa" {
  account_id   = "apigw-partner-sa"
  display_name = "API Gateway Service Account for Partner API"
  project      = var.project_id
}

# Grant API Gateway SA permission to invoke Cloud Run
resource "google_project_iam_member" "apigw_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.apigw_sa.email}"
}

# Define the API
resource "google_api_gateway_api" "b2b_api" {
  provider = google-beta
  api_id   = "b2b-partner-api"
  project  = var.project_id

  depends_on = [google_project_service.apigateway_apis]
}

# Define the API Config from OpenAPI Spec template
resource "google_api_gateway_api_config" "b2b_api_cfg" {
  provider      = google-beta
  api           = google_api_gateway_api.b2b_api.api_id
  api_config_id = "b2b-partner-api-cfg"
  project       = var.project_id

  openapi_documents {
    document {
      path = "spec.yaml"
      contents = base64encode(templatefile("${path.module}/partner_api_spec.yaml.tpl", {
        partner_api_url = google_cloud_run_v2_service.partner_api_service.uri
      }))
    }
  }

  gateway_config {
    backend_config {
      google_service_account = google_service_account.apigw_sa.email
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    google_cloud_run_v2_service.partner_api_service
  ]
}

# Define the Gateway
resource "google_api_gateway_gateway" "b2b_gw" {
  provider   = google-beta
  api_config = google_api_gateway_api_config.b2b_api_cfg.id
  gateway_id = "apigee-b2b-gateway" # Name reflects the requested Apigee architecture
  region     = "us-central1"
  project    = var.project_id

  depends_on = [google_api_gateway_api_config.b2b_api_cfg]
}

output "apigee_gateway_url" {
  description = "The public URL of the B2B Partner API Gateway (Apigee simulation)"
  value       = google_api_gateway_gateway.b2b_gw.default_hostname
}
