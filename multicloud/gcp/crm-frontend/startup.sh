#!/bin/bash

# Update packages and install Node.js and npm
sudo apt-get update
sudo apt-get install -y nodejs npm

# Install pm2, a production process manager for Node.js
sudo npm install pm2 -g

# Create a directory for the app
sudo mkdir -p /opt/crm-frontend
sudo chown -R $(whoami):$(whoami) /opt/crm-frontend
cd /opt/crm-frontend

# Create the package.json file
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/package_json > package.json

# Create the frontend app.js file
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js > app.js

# Install application dependencies
npm install

# Start the application using pm2
pm2 start app.js --name "crm-frontend"
pm2 startup
pm2 save

