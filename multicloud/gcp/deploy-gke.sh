#!/bin/bash
set -e

echo "======================================"
echo " Deploying Core GKE Cluster (GCP)"
echo "======================================"

cd "$(dirname "$0")/terraform/gke"

# Verify tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "Creating terraform.tfvars from example..."
    cp terraform.tfvars.example terraform.tfvars
    echo "Please update terraform.tfvars with your actual GCP project ID, then re-run this script."
    exit 1
fi

echo "Initializing Terraform..."
terraform init

echo "Applying Terraform configuration..."
terraform apply -auto-approve

echo "GKE deployment completed successfully!"
