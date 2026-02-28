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
    "name": "order_id",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Unique identifier for the order"
  },
  {
    "name": "user_id",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "User ID of the customer"
  },
  {
    "name": "email",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Email of the customer"
  },
  {
    "name": "user_currency",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Original checkout currency"
  },
  {
    "name": "shipping_tracking_id",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Logistics tracking ID"
  },
  {
    "name": "shipping_cost",
    "type": "RECORD",
    "mode": "NULLABLE",
    "description": "Monetary cost of shipping",
    "fields": [
      {
        "name": "currency_code",
        "type": "STRING",
        "mode": "REQUIRED"
      },
      {
        "name": "units",
        "type": "INT64",
        "mode": "REQUIRED"
      },
      {
        "name": "nanos",
        "type": "INT64",
        "mode": "REQUIRED"
      }
    ]
  },
  {
    "name": "shipping_address",
    "type": "RECORD",
    "mode": "NULLABLE",
    "description": "Destination address",
    "fields": [
      { "name": "street_address", "type": "STRING", "mode": "NULLABLE" },
      { "name": "city", "type": "STRING", "mode": "NULLABLE" },
      { "name": "state", "type": "STRING", "mode": "NULLABLE" },
      { "name": "country", "type": "STRING", "mode": "NULLABLE" },
      { "name": "zip_code", "type": "INT64", "mode": "NULLABLE" }
    ]
  },
  {
    "name": "items",
    "type": "RECORD",
    "mode": "REPEATED",
    "description": "Line items in the order",
    "fields": [
      {
        "name": "item",
        "type": "RECORD",
        "mode": "NULLABLE",
        "fields": [
          { "name": "product_id", "type": "STRING", "mode": "REQUIRED" },
          { "name": "quantity", "type": "INT64", "mode": "REQUIRED" }
        ]
      },
      {
        "name": "cost",
        "type": "RECORD",
        "mode": "NULLABLE",
        "fields": [
          { "name": "currency_code", "type": "STRING", "mode": "REQUIRED" },
          { "name": "units", "type": "INT64", "mode": "REQUIRED" },
          { "name": "nanos", "type": "INT64", "mode": "REQUIRED" }
        ]
      }
    ]
  }
]
EOF

  depends_on = [google_project_service.bigquery_api]
}
