#!/bin/bash
set -e

echo "======================================"
echo " Deploying Multicloud Services (GCP)"
echo "======================================"

cd "$(dirname "$0")/terraform/services"

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

echo "GCP Services deployment completed successfully!"
