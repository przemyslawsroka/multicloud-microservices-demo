# Log Exclusion Filters - Clean Logs Configuration

This document describes the log exclusion filters configured to eliminate benign system errors from Cloud Logging, resulting in clean logs that only show actual application issues.

## Summary

**6 exclusion filters** have been configured to filter out benign GKE system operations that don't impact application functionality.

## Exclusion Filters

### 1. GKE Ingress Permission Probe
**Name:** `gke-ingress-permission-probe`
**Purpose:** GKE controller checks permissions by probing for a dummy backend service
**Why it's safe to exclude:** Permission IS granted (verified). The "not found" error is expected - GKE uses this to verify it has permissions without creating actual resources.

```
Filter: logName:"cloudaudit.googleapis.com/data_access"
        severity="ERROR"
        protoPayload.methodName="v1.compute.backendServices.get"
        protoPayload.status.message=~"k8s-ingress-svc-acct-permission-check-probe.*was not found"
```

### 2. GKE Unknown Internal Metrics
**Name:** `gke-unknown-internal-metrics`
**Purpose:** GKE nodes try to write internal health check metrics that aren't registered
**Why it's safe to exclude:** Permission IS granted. These are internal GKE monitoring metrics (`kubernetes.io/internal/nodes/snk/*`) that may not be enabled in all projects.

```
Filter: logName:"cloudaudit.googleapis.com/data_access"
        severity="ERROR"
        protoPayload.methodName="google.monitoring.v3.MetricService.CreateServiceTimeSeries"
        protoPayload.status.message=~"kubernetes.io/internal/nodes/snk.*unknown metric type"
```

### 3. GKE Old Instance Groups Probe
**Name:** `gke-old-instance-groups-probe`
**Purpose:** GKE checks for old/deleted instance groups during cleanup
**Why it's safe to exclude:** Normal GKE resource cleanup operations. These "not found" errors are expected when GKE cleans up old resources.

```
Filter: logName:"cloudaudit.googleapis.com/data_access"
        severity="ERROR"
        protoPayload.methodName="v1.compute.instanceGroups.listInstances"
        protoPayload.status.message=~"was not found"
```

### 4. Kube-System Empty Stderr Logs
**Name:** `kube-system-empty-stderr`
**Purpose:** Empty error logs from kube-system containers
**Why it's safe to exclude:** These are empty log entries (no actual error message) from system containers like metrics-server, fluentbit-gke, and snk.

```
Filter: logName:"stderr"
        severity="ERROR"
        resource.labels.namespace_name="kube-system"
        textPayload=""
```

### 5. Pod Termination Signals
**Name:** `kube-pod-termination-signals`
**Purpose:** Normal pod shutdown signals
**Why it's safe to exclude:** When pods shut down gracefully, they log termination signals. This is normal Kubernetes lifecycle behavior, not an error.

```
Filter: logName:"stderr"
        severity="ERROR"
        textPayload=~"Shutting down, got signal: Terminated"
```

### 6. GCE Guest Agent Empty Errors
**Name:** `gce-guest-agent-empty-errors`
**Purpose:** Empty error logs from GCE Guest Agent
**Why it's safe to exclude:** These are empty log entries with no actual error content from the GCE Guest Agent system process.

```
Filter: logName:"GCEGuestAgent"
        severity="ERROR"
        textPayload=""
```

### 7. ~~Transient 503 Service Unavailable Errors~~ (REMOVED)
**Status:** This filter has been **removed per user request**. HTTP 503 errors are now **visible in logs** for monitoring and debugging purposes.

## Management Commands

### List All Exclusion Filters
```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://logging.googleapis.com/v2/projects/YOUR_GCP_PROJECT_ID/exclusions"
```

### Delete an Exclusion Filter (if needed)
```bash
curl -X DELETE -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://logging.googleapis.com/v2/projects/YOUR_GCP_PROJECT_ID/exclusions/FILTER_NAME"
```

### Update an Exclusion Filter
```bash
curl -X PATCH -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://logging.googleapis.com/v2/projects/YOUR_GCP_PROJECT_ID/exclusions/FILTER_NAME?updateMask=filter,description" \
  -d '{"description": "Updated description", "filter": "updated filter"}'
```

## Important Notes

### Log Exclusion Behavior
- **Exclusions only apply to NEW logs** being ingested after the filter is created
- Historical logs that match the filter will still appear in queries
- There may be a slight propagation delay (30-60 seconds) before exclusions take full effect

### Monitoring
- Exclusion filters have been carefully designed to only hide **verified benign errors**
- All actual application errors, permission denials, and real connectivity issues will still be logged
- If you suspect an issue, you can temporarily disable a filter by setting `"disabled": true`

### Best Practices
1. Regularly review excluded log patterns to ensure they're still appropriate
2. If a new type of benign error appears, create a specific exclusion filter rather than broadening existing ones
3. Document any new exclusions in this file
4. Test changes in a non-production environment first if possible

## Verification

To verify logs are clean:
```bash
# Check for any ERROR logs in the last hour
gcloud logging read "severity=ERROR AND timestamp>=\"$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)\"" \
  --limit=50 --format="table(timestamp,logName,severity)" --project=YOUR_GCP_PROJECT_ID
```

Expected result: No errors, or only actual application/infrastructure issues that need attention.

## Related Documentation
- [GCP Cloud Logging Exclusions](https://cloud.google.com/logging/docs/exclusions)
- [GKE Logging Best Practices](https://cloud.google.com/kubernetes-engine/docs/how-to/logging)

