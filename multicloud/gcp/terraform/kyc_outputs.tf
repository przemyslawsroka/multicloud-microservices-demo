output "kyc_service_url" {
  value       = "http://${google_compute_address.kyc_static_ip.address}:8080"
  description = "The URL to access the KYC service over internal IP"
}
