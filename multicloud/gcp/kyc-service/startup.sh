#!/bin/bash
set -e

# Update and install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs jq

# Create app directory
mkdir -p /opt/app
cd /opt/app

# Retrieve application files from metadata
curl -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js" > app.js
curl -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/package_json" > package.json

# Extract and install dependencies
npm install

# Install PM2 for process management
npm install -g pm2

# Start application and configure to start on boot
pm2 start app.js --name kyc-service
pm2 startup systemd
pm2 save
