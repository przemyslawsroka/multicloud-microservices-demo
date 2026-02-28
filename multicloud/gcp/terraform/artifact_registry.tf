# artifact_registry.tf - Docker repos for Online Boutique customizations

resource "google_artifact_registry_repository" "online_boutique_repo" {
  location      = var.region
  repository_id = "online-boutique"
  description   = "Docker repository for rebuilt Online Boutique microservices (e.g., checkoutservice)"
  format        = "DOCKER"

  docker_config {
    immutable_tags = false
  }
}

output "online_boutique_repo_name" {
  value       = google_artifact_registry_repository.online_boutique_repo.name
  description = "The name of the Online Boutique artifact registry repository"
}
