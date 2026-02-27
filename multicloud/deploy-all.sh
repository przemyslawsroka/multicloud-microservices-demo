#!/bin/bash
set -e

echo "🚀 Starting Full Multicloud Deployment"
echo "----------------------------------------"

echo "Prerequisite check: Make sure you've already deployed the primary GKE cluster"
echo "by running 'terraform apply' in the root project folder ./terraform/ before continuing!"
read -p "Press enter to continue or Ctrl+C to abort..."

# 1. Deploy Azure Analytics Service
./azure/deploy-analytics.sh

# 2. Deploy GCP Services (CRM, Inventory, Warehouse, Accounting)
# These rely on information from both the core deployment and other modules
./gcp/deploy-services.sh

echo "----------------------------------------"
echo "✅ Multicloud Deployment Complete!"
echo "Check your terraform outputs to get the IP addresses and URLs."
echo "Update your multicloud/checkout-config/checkoutservice-config.yaml with these values."
