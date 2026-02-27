# Multicloud Infrastructure Documentation

This folder contains Terraform configurations that deploy microservices across Azure and Google Cloud Platform, demonstrating various deployment patterns including VMs, Cloud Run, and advanced networking configurations.

### Key Features

- **Multi-Cloud Deployment**: Demonstrates deploying microservices across both Azure and Google Cloud Platform.
- **Diverse Compute Options**: Utilizes a mix of VMs (Azure, GCP Compute Engine) and serverless (GCP Cloud Run) to showcase different hosting models.
- **Advanced GCP Networking**: Implements sophisticated networking patterns including:
  - **VPC Peering**: For connecting services across different VPCs.
  - **Private Service Connect (PSC)**: To securely expose services without public IPs.
  - **Direct VPC Egress & VPC Connectors**: Comparing two methods for serverless networking.
- **Service Isolation**: Each service is deployed in its own dedicated VPC for enhanced security.
- **CI/CD Automation**: Uses Cloud Build for automated container builds and deployments.


## Architecture Documentation

The architectural overview, system blueprints, and detailed networking diagrams have been split into the following dedicated documents:

1. **[Business View](./BUSINESS_VIEW.md)** - Logical description of enterprise IT systems.
2. **[Technical View](./TECHNICAL_VIEW.md)** - System specifications, API communication, and integration patterns.
3. **[Networking View](./NETWORKING_VIEW.md)** - Specification of the multicloud networking topologies (Peering vs PSC vs Serverless Egress vs Interconnect).

## Deployment Instructions

### Prerequisites

1. **Terraform**: Install Terraform >= 1.0
2. **Cloud CLI Tools**: 
   - Azure CLI logged in (`az login`)
   - Google Cloud SDK with project access (`gcloud auth login`)
   - Docker for building Cloud Run images
3. **Cloud Provider Accounts**: Active accounts with billing enabled
4. **GCP APIs**: Enable required APIs:
```bash
   gcloud services enable compute.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable vpcaccess.googleapis.com
   gcloud services enable servicenetworking.googleapis.com
   ```

### Azure Deployment

```bash
cd azure/
# Copy and configure the variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and set your actual Azure subscription ID

terraform init
terraform plan
terraform apply
```

**Alternative using environment variable**:
```bash
cd azure/
export TF_VAR_subscription_id="your-azure-subscription-id"
terraform init
terraform plan
terraform apply
```

**Outputs**:
- `public_ip`: Azure VM public IP
- `application_url`: Direct URL to metrics endpoint

**Note**: VM password is randomly generated and stored in Terraform state.

### GCP Deployment

**File Structure:**
```
gcp/
├── main.tf             # Shared Terraform, provider, and backend configuration
├── crm.tf              # CRM service (VM in asia-east1)
├── inventory.tf        # Inventory service (VM with private IP + PSC)
├── warehouse.tf             # Warehouse service (Cloud Run with Direct VPC Egress)
├── accounting.tf       # Accounting service (Cloud Run with VPC Connector)
├── warehouse-service/       # Warehouse service application code
├── accounting-service/ # Accounting service application code
└── terraform.tfvars    # Your project configuration (not in Git)
```

#### Step 1: Deploy VM-based services (CRM, Inventory)

```bash
cd gcp/

# Copy and configure the variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and set:
#   - project_id: Your GCP project ID
#   - region: Your preferred region (default: us-central1)
#   - zone: Your preferred zone (default: us-central1-a)

# Deploy VM services
terraform init
terraform plan
terraform apply
```

**VM Services Outputs**:
- `crm_vm_private_ip`: CRM service private IP (asia-east1)
- `inventory_vm_private_ip`: Inventory VM private IP (europe-west1, no external access)
- `inventory_psc_endpoint_ip`: PSC endpoint to access inventory

#### Step 2: Build and deploy Warehouse Service (Cloud Run)

```bash
cd gcp/warehouse-service/

# Build and push Docker image
./build.sh

# Or manually:
gcloud builds submit --config=cloudbuild.yaml \
  --project=your-project-id

# Deploy with Terraform (already configured in warehouse.tf)
cd ..
terraform apply
```

**Warehouse Service Outputs**:
- `warehouse_service_url`: Cloud Run service URL
- `warehouse_vpc_config`: VPC egress configuration details

#### Step 3: Build and deploy Accounting Service (Cloud Run)

```bash
cd gcp/accounting-service/

# Build and push Docker image
./build.sh

# Or manually:
gcloud builds submit --config=cloudbuild.yaml \
  --project=your-project-id

# Deploy with Terraform (already configured in accounting.tf)
cd ..
terraform apply
```

**Accounting Service Outputs**:
- `accounting_service_url`: Cloud Run service URL
- `accounting_vpc_connector`: VPC Connector configuration

#### Alternative: Deploy All Services at Once

```bash
cd gcp/

# Build both Cloud Run services first
cd warehouse-service && ./build.sh && cd ..
cd accounting-service && ./build.sh && cd ..

# Deploy everything with Terraform
terraform init
terraform plan
terraform apply
```

## Testing the Services

### Using curl

**Test Azure Analytics Service**:
```bash
# Get metrics
curl http://<azure-ip>:8080/metrics

# Record metric
curl -X POST http://<azure-ip>:8080/metrics \
  -H "Content-Type: application/json" \
  -d '{"transactionType":"checkout","durationMs":150,"success":true}'
```

**Test GCP CRM Service** (from a peered VPC):
```bash
# Get CRM private IP from terraform output
CRM_IP=$(terraform output -raw crm_vm_private_ip)

# List customers
curl http://$CRM_IP:8080/customers

# Add customer
curl -X POST http://$CRM_IP:8080/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","surname":"Johnson"}'
```

**Test GCP Inventory Service** (via PSC):
```bash
# Get PSC endpoint IP from terraform output
INVENTORY_PSC_IP=$(terraform output -raw inventory_psc_endpoint_ip)

# Health check
curl http://$INVENTORY_PSC_IP:8080/health

# List all inventory
curl http://$INVENTORY_PSC_IP:8080/inventory

# Get specific product inventory
curl http://$INVENTORY_PSC_IP:8080/inventory/OLJCESPC7Z

# Reserve stock
curl -X POST http://$INVENTORY_PSC_IP:8080/inventory/OLJCESPC7Z/reserve \
  -H "Content-Type: application/json" \
  -d '{"quantity":2}'

# Release reserved stock
curl -X POST http://$INVENTORY_PSC_IP:8080/inventory/OLJCESPC7Z/release \
  -H "Content-Type: application/json" \
  -d '{"quantity":1}'

# Update stock levels
curl -X PUT http://$INVENTORY_PSC_IP:8080/inventory/OLJCESPC7Z \
  -H "Content-Type: application/json" \
  -d '{"stockLevel":50}'
```

**Test GCP Warehouse Service** (Cloud Run with inventory integration):
```bash
# Get warehouse service URL
WAREHOUSE_URL=$(terraform output -raw warehouse_service_url)

# Health check
curl $WAREHOUSE_URL/health

# List warehouse items (includes inventory check)
curl $WAREHOUSE_URL/warehouse

# Get specific warehouse item
curl $WAREHOUSE_URL/warehouse/1

# Add warehouse item
curl -X POST $WAREHOUSE_URL/warehouse \
  -H "Content-Type: application/json" \
  -d '{"name":"Caesar Salad","category":"Salad","price":8.99,"available":true}'

# Update warehouse item
curl -X PUT $WAREHOUSE_URL/warehouse/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Margherita Pizza","category":"Italian","price":14.99,"available":true}'

# Delete warehouse item
curl -X DELETE $WAREHOUSE_URL/warehouse/1
```

**Test GCP Accounting Service** (Cloud Run with CRM integration):
```bash
# Get accounting service URL
ACCOUNTING_URL=$(terraform output -raw accounting_service_url)

# Health check
curl $ACCOUNTING_URL/health

# List transactions (includes CRM customer data)
curl $ACCOUNTING_URL/transactions

# Get specific transaction
curl $ACCOUNTING_URL/transactions/1

# Add transaction
curl -X POST $ACCOUNTING_URL/transactions \
  -H "Content-Type: application/json" \
  -d '{"item":"Office Supplies","price":99.99,"date":"2025-10-29","customer":"John Doe"}'

# Update transaction
curl -X PUT $ACCOUNTING_URL/transactions/1 \
  -H "Content-Type: application/json" \
  -d '{"item":"Software License","price":299.99,"date":"2025-10-29","customer":"Jane Smith"}'

# Delete transaction
curl -X DELETE $ACCOUNTING_URL/transactions/1
```

## Cost Considerations

### Azure
- **Standard_B1s**: Burstable performance, pay-per-use (~$10-15/month)
- **Public IP**: Small charge for static IP allocation

### GCP Compute Engine (VMs)
- **e2-micro**: Always-free tier eligible (1 per month per region)
- **CRM, Inventory**: ~$5-8/month each if not in free tier

### GCP Cloud Run (Serverless)
- **Warehouse & Accounting Services**: Pay-per-request pricing
  - First 2 million requests free per month
  - $0.40 per million requests after that
  - CPU/Memory only charged during request processing
  - Minimal cost for low traffic (~$1-5/month)

### GCP Networking
- **VPC Connector**: ~$0.035/hour (~$25/month) + data processing
- **Direct VPC Egress**: More cost-effective, no connector charges
- **Private Service Connect**: $0.01/GB processed
- **Inter-region data transfer**: $0.01-0.12/GB depending on regions

### Cost Optimization Tips
1. Use Direct VPC Egress instead of VPC Connector when possible
2. Set Cloud Run min instances to 0 for development
3. Use e2-micro instances in free tier (one per region)
4. Deploy services in same region to minimize data transfer costs
5. Monitor VPC Connector usage and consider Direct VPC Egress alternatives

## Security Notes

- **Public Services**: Accept traffic from 0.0.0.0/0 for demonstration
- **Private Services**: Inventory VM has no external IP, only PSC access
- **Network Isolation**: Each service in dedicated VPC
- **Firewall Rules**: Granular control per service
- **Production Recommendations**:
  - Restrict source IP ranges to known networks
  - Implement authentication (Cloud IAM, API keys)
  - Enable HTTPS termination (Cloud Load Balancer)
  - Use Secret Manager for sensitive data
  - Enable VPC Flow Logs for audit trails

## Known Issues & Ongoing Work

1. **GCP CRM Direct Calls**: Intermittent timeouts - may need VPC peering adjustment.
2. **Inventory/Furniture Services**: JSON decode warnings exist (API temporarily returns an array instead of standard objects but doesn't block orders).
3. **Warehouse → Inventory Connectivity**: Egress connection currently unavailable/timeout (VPC connectivity issue under investigation).
4. **Checkout Service Docker Image**: If Kubernetes reverts to `us-central1-docker.pkg.dev/google-samples/microservices-demo/checkoutservice:v0.10.3`, the multicloud code will break. Always ensure we use `gcr.io/network-obs-demo/checkoutservice:latest`.

## Cleanup

To avoid ongoing charges, destroy resources when done:

```bash
# In each service directory
terraform destroy
```

## Troubleshooting

### Common Issues

1. **Service not responding**: 
   - Wait 2-3 minutes after deployment for VM application startup
   - Cloud Run services start instantly but may have cold starts
   - Check firewall rules and VPC configurations

2. **Connection refused**: 
   - Verify firewall rules allow traffic on port 8080
   - Check if VM is running: `gcloud compute instances list`
   - For Cloud Run, ensure service is deployed: `gcloud run services list`

3. **404 errors**: 
   - Verify the service endpoints match the API contract
   - Check application logs for startup errors

4. **Cloud Run to VM connection failures**:
   - Verify VPC Connector or Direct VPC Egress is configured
   - Check firewall rules allow traffic from Cloud Run subnet
   - Ensure target VM has correct internal IP

5. **GCP project errors**: 
   - Ensure project ID is correctly set and billing is enabled
   - Verify all required APIs are enabled (see Prerequisites)

### Logs Access

- **Azure VMs**: Use Azure portal serial console or SSH with generated password
- **GCP VMs**: 
  ```bash
  gcloud compute ssh <instance-name> --zone=<zone>
  # Check logs: sudo journalctl -u app.service -f
  # Or: sudo cat /var/log/startup-script.log
  ```
- **GCP Cloud Run**:
  ```bash
  gcloud run services logs read <service-name> --region=<region>
  # Or use Cloud Console Logs Explorer
  ```

### Debugging Network Issues

**Test VPC connectivity:**
```bash
# From GKE pod or Cloud Shell in same VPC
curl http://10.20.0.2:8080/health # Inventory service
curl http://10.3.0.2:8080/customers # CRM service
```

**Check firewall rules:**
```bash
gcloud compute firewall-rules list --filter="network:inventory-vpc"
```

**Verify VPC Connector:**
```bash
gcloud compute networks vpc-access connectors list --region=us-central1
```

## Complete Ecommerce Workflow

These services create a complete multicloud ecommerce platform:

### Service Architecture

```
┌─────────────────┐
│ Online Boutique │ (GKE Kubernetes)
│   Checkout      │
└────────┬────────┘
         │
    ┌────┴────┬───────────┬──────────────┐
    │         │           │              │
    ▼         ▼           ▼              ▼
┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│  Warehouse  │ │Accounting│ │ Other    │ │Analytics │
│Service │ │ Service │ │ Services │ │ Service  │
│(Cloud  │ │(Cloud   │ │          │ │  (Azure) │
│ Run)   │ │  Run)   │ │          │ │          │
└───┬────┘ └────┬─────┘ └──────────┘ └──────────┘
    │           │
    │ Direct    │ VPC
    │ VPC Egress│ Connector
    │           │
    ▼           ▼
┌──────────┐ ┌─────────┐
│Inventory │ │   CRM   │
│ Service  │ │ Service │
│(Private) │ │  (VM)   │
│  (PSC)   │ │asia-east1│
└──────────┘ └─────────┘
```

### Integration Flow

1. **Customer browses catalog** → Warehouse service provides product data
2. **Check inventory** → Warehouse service calls Inventory service (Direct VPC Egress)
3. **Customer checkout** → Checkout service orchestrates the flow
4. **Record transaction** → Accounting service saves transaction + fetches CRM data (VPC Connector)
5. **Risk Analysis Enforcement** → Fraud Detection Engine evaluates transaction risk securely over VPN tunnel
6. **Update inventory** → Inventory service reserves/releases stock via PSC

### Key Integration Points

| Source Service | Target Service | Connection Type | Purpose |
|----------------|----------------|-----------------|---------|
| Checkout | Warehouse Service | Public HTTPS | Get warehouse catalog |
| Checkout | Accounting Service | Public HTTPS | Record transactions |
| Warehouse Service | Inventory Service | Direct VPC Egress | Check stock levels |
| Accounting Service | CRM Service | VPC Connector | Get customer data |
| Other VPCs | Inventory Service | Private Service Connect | Stock management |

### Example: Complete Order Flow

```bash
# 1. Customer checks warehouse menu
curl https://warehouse-service-url/warehouse
# Response includes inventory check from Inventory service

# 2. Customer places order via checkout
# Checkout service internally calls:
#   - Warehouse service (validate items)
#   - Accounting service (create transaction)

# 3. Accounting service records transaction
curl https://accounting-service-url/transactions
# Response includes CRM customer data

# 4. Analytics tracks the performance
curl http://azure-analytics-ip:8080/metrics
# Shows transaction performance metrics
```

## Benefits of This Architecture

1. **Multi-cloud resilience**: Services distributed across providers
2. **Network security**: Private services with controlled access
3. **Cost optimization**: Serverless for variable workloads, VMs for consistent loads
4. **Scalability**: Cloud Run auto-scales, VMs can be managed instance groups
5. **Service isolation**: Each service in dedicated VPC/network
6. **Modern patterns**: Demonstrates both VM and serverless deployments 