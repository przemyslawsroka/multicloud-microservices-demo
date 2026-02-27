#!/bin/bash
set -e

echo "🚀 Starting Full Multicloud Deployment"
echo "----------------------------------------"

# 1. Deploy GKE Cluster (GCP Base)
./gcp/deploy-gke.sh

# 2. Deploy Azure Analytics Service
./azure/deploy-analytics.sh

# 3. Deploy GCP Services (CRM, Inventory, Warehouse, Accounting)
# These rely on information from both the core deployment and other modules
./gcp/deploy-services.sh

echo "----------------------------------------"
echo "✅ Multicloud Deployment Complete!"
echo "Check your terraform configurations to get the IP addresses and URLs."
echo "Update your multicloud/checkout-config/checkoutservice-config.yaml with these values."
