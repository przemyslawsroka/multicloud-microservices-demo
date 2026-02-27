# data_warehouse.tf - BigQuery Data Warehouse Configuration

# Enable BigQuery API
resource "google_project_service" "bigquery_api" {
  service            = "bigquery.googleapis.com"
  disable_on_destroy = false
}

# Create BigQuery Dataset in EU multi-region
resource "google_bigquery_dataset" "enterprise_data_lake" {
  dataset_id                  = "enterprise_data_lake"
  friendly_name               = "Enterprise Data Lake"
  description                 = "Central data warehouse for enterprise telemetry, ledgers, and events"
  location                    = "EU"
  default_table_expiration_ms = null # Tables don't expire by default

  depends_on = [google_project_service.bigquery_api]
}

# Create BigQuery Table for Order Events
resource "google_bigquery_table" "order_events" {
  dataset_id          = google_bigquery_dataset.enterprise_data_lake.dataset_id
  table_id            = "order_events"
  deletion_protection = false

  schema = <<EOF
[
  {
    "name": "orderId",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Unique identifier for the order"
  },
  {
    "name": "customerEmail",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Email of the customer"
  },
  {
    "name": "totalAmount",
    "type": "FLOAT",
    "mode": "REQUIRED",
    "description": "Total monetary amount of the order"
  },
  {
    "name": "currency",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Currency code"
  },
  {
    "name": "timestamp",
    "type": "TIMESTAMP",
    "mode": "REQUIRED",
    "description": "Time the event was published"
  },
  {
    "name": "publish_time",
    "type": "TIMESTAMP",
    "mode": "NULLABLE",
    "description": "Pub/Sub publish timestamp"
  },
  {
    "name": "message_id",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Pub/Sub message ID"
  }
]
EOF

  depends_on = [google_project_service.bigquery_api]
}
