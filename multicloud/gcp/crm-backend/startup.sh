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
sudo mkdir -p /opt/app
sudo chown -R $(whoami):$(whoami) /opt/app
cd /opt/app

# Create the package.json file
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/package_json > package.json

# Create the app.js file from metadata
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js > app.js

# Retrieve database connection variables from metadata
DB_HOST=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/db_host || echo "")
DB_USER=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/db_user || echo "crm_user")
DB_PASS=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/db_pass || echo "password123")

# Install application dependencies
npm install

# Start the application using pm2 to run it in the background with NODE_ENV set
if [ -n "$DB_HOST" ]; then
  DB_HOST=$DB_HOST DB_USER=$DB_USER DB_PASS=$DB_PASS NODE_ENV=production pm2 start app.js --name "crm-app"
else
  NODE_ENV=production pm2 start app.js --name "crm-app"
fi

# Save the PM2 process list and configure it to start on system boot
pm2 save
pm2 startup systemd -u root --hp /root

