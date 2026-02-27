# Multicloud Checkout Service Configuration

The `checkoutservice` is the central service that orchestrates calls to the external multicloud business APIs. Whenever a simulated user places an order, the `checkoutservice` reaches out to the integrated services across Azure and GCP.

## Testing Your Configuration

You need to provide the URLs for the multicloud business services directly into the `checkoutservice` via environment variables.

### Using Kubernetes ConfigMaps (Recommended)

Apply the configuration and restart the checkout service:

```bash
# Apply the config map with your actual service URLs
kubectl apply -f checkoutservice-config.yaml

# Restart the checkout service to pick up the changes
kubectl rollout restart deployment/checkoutservice
```

### Direct Environment Variables

Alternatively, you can edit your deployments directly in `kubernetes-manifests/checkoutservice.yaml` or `kustomize/base/checkoutservice.yaml` to include:

```yaml
env:
- name: AZURE_ANALYTICS_URL
  value: "http://<YOUR_AZURE_IP>:8080"
- name: GCP_CRM_URL
  value: "http://<YOUR_GCP_IP>:8080"
- name: GCP_INVENTORY_URL
  value: "http://<YOUR_GCP_PSC_IP>:8080"
- name: GCP_FURNITURE_URL
  value: "http://<YOUR_GCP_FURNITURE_IP>:8080"
- name: GCP_WAREHOUSE_URL
  value: "https://<YOUR_GCP_WAREHOUSE_URL>"
- name: GCP_ACCOUNTING_URL
  value: "https://<YOUR_GCP_ACCOUNTING_URL>"
```

## Verifying Integration

1. Check that the `checkoutservice` is successfully pushing data to your external endpoints:
   ```bash
   kubectl logs -f deployment/checkoutservice
   ```
2. Verify you see log entries formatted like:
   - "Recording metrics in Azure Analytics... success=true"
   - "CRM Integration via VPC Connector: connected=true"
