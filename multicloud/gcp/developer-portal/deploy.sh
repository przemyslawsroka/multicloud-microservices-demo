#!/bin/bash
set -e

echo "Deploying Developer Portal to Cloud Run..."
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
REPO="boutique-repo"
IMAGE_URL="europe-west1-docker.pkg.dev/$PROJECT_ID/$REPO/developer-portal:latest"

echo "Building Docker Image locally..."
# If using arm64 (like M1/M2/M3 macs), we must specify platform for Cloud Run (which is linux/amd64)
docker build --platform linux/amd64 -t $IMAGE_URL .

echo "Pushing Docker Image to Artifact Registry..."
docker push $IMAGE_URL

echo "Deploying to Cloud Run..."
gcloud run deploy developer-portal \
  --image $IMAGE_URL \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 512Mi

echo "Deployment completed successfully! The portal is live."
