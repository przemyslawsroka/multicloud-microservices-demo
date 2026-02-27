#!/bin/bash

# Update packages and install curl
sudo apt-get update
sudo apt-get install -y curl

# Install nvm (Node Version Manager) and Node.js v18
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18

# Create symlinks to make node and pm2 available globally
sudo ln -s "$(which node)" "/usr/local/bin/node"
sudo ln -s "$(which npm)" "/usr/local/bin/npm"

# Install pm2, a production process manager for Node.js
npm install pm2 -g
sudo ln -s "$(which pm2)" "/usr/local/bin/pm2"

# Create a directory for the app
sudo mkdir -p /opt/crm-status
sudo chown -R $(whoami):$(whoami) /opt/crm-status
cd /opt/crm-status

# Create the package.json file
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/package_json > package.json

# Create the status monitor app.js file
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js > app.js

# Install application dependencies
npm install

# Start the application using pm2
pm2 start app.js --name "crm-status"
pm2 startup
pm2 save

