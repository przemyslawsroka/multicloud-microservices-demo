#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/startup-script.log) 2>&1
echo "Starting inventory service setup at $(date)"

# Update packages and install Node.js and npm
apt-get update
apt-get install -y nodejs npm

echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install pm2, a production process manager for Node.js
npm install pm2 -g

echo "PM2 version: $(pm2 --version)"

# Create a directory for the app
mkdir -p /opt/app
cd /opt/app

# Create the package.json file
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/package_json > package.json

# Create the app.js file with the inventory service logic
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js > app.js

echo "Created app.js and package.json"

# Install application dependencies
npm install

echo "NPM dependencies installed"

# Start the application using pm2
pm2 start app.js --name "inventory-app"

# Save the PM2 process list
pm2 save

# Configure PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

echo "Inventory service started successfully at $(date)"
echo "PM2 status:"
pm2 list
