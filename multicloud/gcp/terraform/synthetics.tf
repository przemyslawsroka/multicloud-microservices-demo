# synthetics.tf - GCP Synthetic Monitors (Uptime Checks)

# Enable required APIs
resource "google_project_service" "synthetics_apis" {
  for_each = toset([
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "monitoring.googleapis.com",
    "artifactregistry.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Create a Cloud Storage Bucket to hold the source code zip files
resource "google_storage_bucket" "synthetics_source_bucket" {
  name          = "${var.project_id}-synthetics-src"
  location      = "US"
  project       = var.project_id
  force_destroy = true
}

# Archive the internal API monitor source
data "archive_file" "internal_api_zip" {
  type        = "zip"
  output_path = "${path.module}/internal_api_monitor.zip"
  source_dir  = "${path.module}/../synthetic-tests/internal-api-monitor"
}

# Upload the internal API monitor zip
resource "google_storage_bucket_object" "internal_api_obj" {
  name   = "internal_api_monitor_${data.archive_file.internal_api_zip.output_md5}.zip"
  bucket = google_storage_bucket.synthetics_source_bucket.name
  source = data.archive_file.internal_api_zip.output_path
}

# Archive the frontend journey source
data "archive_file" "frontend_journey_zip" {
  type        = "zip"
  output_path = "${path.module}/frontend_journey.zip"
  source_dir  = "${path.module}/../synthetic-tests/frontend-journey"
}

# Upload the frontend journey zip
resource "google_storage_bucket_object" "frontend_journey_obj" {
  name   = "frontend_journey_${data.archive_file.frontend_journey_zip.output_md5}.zip"
  bucket = google_storage_bucket.synthetics_source_bucket.name
  source = data.archive_file.frontend_journey_zip.output_path
}

# -----------------------------------------------------------------------------------------
# 1. CRM Internal API Monitor (Attached to CRM VPC)
# -----------------------------------------------------------------------------------------

resource "google_cloudfunctions2_function" "crm_synthetic_func" {
  name        = "crm-api-synthetic"
  location    = "us-central1"
  project     = var.project_id

  build_config {
    runtime     = "nodejs18"
    entry_point = "SyntheticFunction"
    source {
      storage_source {
        bucket = google_storage_bucket.synthetics_source_bucket.name
        object = google_storage_bucket_object.internal_api_obj.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 60
    environment_variables = {
      CRM_URL       = "http://${google_compute_address.crm_backend_ilb_ip.address}:8080/health"
      INVENTORY_URL = "SKIP" # Ignored since we only test CRM dynamically here to avoid VPC boundaries
    }
    vpc_access {
      network_interfaces {
        network    = google_compute_network.crm_vpc.id
        subnetwork = google_compute_subnetwork.crm_subnet.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }
  }
  depends_on = [google_project_service.synthetics_apis]
}

resource "google_monitoring_uptime_check_config" "crm_synthetic_check" {
  display_name = "CRM Internal Route Synthetic Check"
  timeout      = "60s"
  period       = "300s"
  project      = var.project_id

  synthetic_monitor {
    cloud_function_v2 {
      name = google_cloudfunctions2_function.crm_synthetic_func.id
    }
  }
}

# -----------------------------------------------------------------------------------------
# 2. Inventory Internal API Monitor (Attached to Inventory VPC)
# -----------------------------------------------------------------------------------------

resource "google_cloudfunctions2_function" "inventory_synthetic_func" {
  name        = "inventory-api-synthetic"
  location    = "europe-west1"
  project     = var.project_id

  build_config {
    runtime     = "nodejs18"
    entry_point = "SyntheticFunction"
    source {
      storage_source {
        bucket = google_storage_bucket.synthetics_source_bucket.name
        object = google_storage_bucket_object.internal_api_obj.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 60
    environment_variables = {
      CRM_URL       = "SKIP" # Ignored
      INVENTORY_URL = "http://${google_compute_forwarding_rule.inventory_forwarding_rule.ip_address}:8080/health"
    }
    vpc_access {
      network_interfaces {
        network    = google_compute_network.inventory_vpc.id
        subnetwork = google_compute_subnetwork.inventory_subnet.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }
  }
  depends_on = [google_project_service.synthetics_apis]
}

resource "google_monitoring_uptime_check_config" "inventory_synthetic_check" {
  display_name = "Inventory Internal Route Synthetic Check"
  timeout      = "60s"
  period       = "300s"
  project      = var.project_id

  synthetic_monitor {
    cloud_function_v2 {
      name = google_cloudfunctions2_function.inventory_synthetic_func.id
    }
  }
}

# -----------------------------------------------------------------------------------------
# 3. Frontend Journey Monitor (Puppeteer E2E Check)
# -----------------------------------------------------------------------------------------

resource "google_cloudfunctions2_function" "frontend_synthetic_func" {
  name        = "frontend-journey-synthetic"
  location    = "us-central1"
  project     = var.project_id

  build_config {
    runtime     = "nodejs18"
    entry_point = "SyntheticFunction"
    source {
      storage_source {
        bucket = google_storage_bucket.synthetics_source_bucket.name
        object = google_storage_bucket_object.frontend_journey_obj.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "2G" # Puppeteer requires significant memory overhead
    timeout_seconds    = 120
    environment_variables = {
      TARGET_URL = "http://frontend.public.boutique.local" # Adjust dynamically if frontend yields an IP
    }
  }
  depends_on = [google_project_service.synthetics_apis]
}

resource "google_monitoring_uptime_check_config" "frontend_synthetic_check" {
  display_name = "Frontend User Journey Synthetic Check"
  timeout      = "120s"
  period       = "300s"
  project      = var.project_id

  synthetic_monitor {
    cloud_function_v2 {
      name = google_cloudfunctions2_function.frontend_synthetic_func.id
    }
  }
}
