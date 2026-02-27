# event_broker.tf - Pub/Sub Event Broker Configuration

# Enable Pub/Sub API
resource "google_project_service" "pubsub_api" {
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

data "google_project" "project" {}

# Create Pub/Sub topic for order confirmed events
resource "google_pubsub_topic" "order_events_topic" {
  name = "order-events"

  depends_on = [google_project_service.pubsub_api]
}

# Grant Pub/Sub service account dataEditor role on BigQuery table
resource "google_bigquery_table_iam_member" "pubsub_bq_writer" {
  project    = data.google_project.project.project_id
  dataset_id = google_bigquery_dataset.enterprise_data_lake.dataset_id
  table_id   = google_bigquery_table.order_events.table_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Create BigQuery Subscription for direct streaming
resource "google_pubsub_subscription" "bq_order_events_sub" {
  name  = "order-events-bq-sub"
  topic = google_pubsub_topic.order_events_topic.id

  bigquery_config {
    table            = "${data.google_project.project.project_id}.${google_bigquery_dataset.enterprise_data_lake.dataset_id}.${google_bigquery_table.order_events.table_id}"
    use_topic_schema = true
    write_metadata   = true # Writes publish_time, subscription_name, message_id to columns
  }

  depends_on = [
    google_bigquery_table_iam_member.pubsub_bq_writer
  ]
}
