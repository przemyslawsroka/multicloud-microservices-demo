# main.tf - Shared Terraform configuration for GCP services

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.50.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4.0"
    }
  }

  # Remote state configuration - store in GCS bucket
  backend "gcs" {
    bucket = "gcp-ecommerce-demo-terraform-state"
    prefix = "terraform/state"
  }
}

variable "project_id" {
  description = "The GCP project ID where resources will be created"
  type        = string
}

variable "peering_project_id" {
  description = "GCP project with remote network you want to peer with"
  type        = string
}

variable "peering_vpc_network" {
  description = "Valid name of VPC network in remote project"
  type        = string
}





variable "gcp_project_id" {
  description = "The GCP project ID (alias for project_id)"
  type        = string
  default     = ""
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone for resources"
  type        = string
  default     = "us-central1-a"
}

variable "ob_network_name" {
  description = "Name of the online boutique network"
  type        = string
  default     = "online-boutique-vpc"
}

variable "ob_subnet_name" {
  description = "Name of the online boutique subnet"
  type        = string
  default     = "online-boutique-vpc"
}

variable "ob_gke_pod_range" {
  description = "GKE pod IP range for online boutique"
  type        = list(string)
  default     = ["10.4.0.0/14"]
}

provider "google" {
  project = var.project_id != "" ? var.project_id : var.gcp_project_id
  region  = var.region
}

provider "google-beta" {
  project               = var.project_id
  billing_project       = var.project_id
  user_project_override = true
}

resource "google_compute_network" "ob_vpc" {
  name                    = var.ob_network_name
  auto_create_subnetworks = false
  project                 = var.project_id

  lifecycle {
    ignore_changes = [auto_create_subnetworks]
  }
}

resource "google_network_management_vpc_flow_logs_config" "ob_vpc_flow_logs" {
  vpc_flow_logs_config_id = "online-boutique-vpc-flow-logs"
  location                = "global"
  network                 = google_compute_network.ob_vpc.id
  state                   = "ENABLED"
  flow_sampling           = 1.0
  aggregation_interval    = "INTERVAL_5_SEC"
}
