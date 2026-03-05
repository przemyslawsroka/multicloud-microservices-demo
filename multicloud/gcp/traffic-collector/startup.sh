#!/bin/bash
apt-get update
apt-get install -y python3 python3-pip

mkdir -p /opt/traffic-collector/api /opt/traffic-collector/public
cd /opt/traffic-collector

# Fetch metadata from terraform
curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/collector_py" > /opt/traffic-collector/api/collector.py
curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/index_html" > /opt/traffic-collector/public/index.html
curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/style_css" > /opt/traffic-collector/public/style.css
curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js" > /opt/traffic-collector/public/app.js

# Wait a moment for network to be fully up and google metadata
sleep 5

pip3 install flask

# Create a systemd services
cat <<EOF > /etc/systemd/system/traffic-collector.service
[Unit]
Description=Traffic Collector API
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/traffic-collector/api/collector.py
WorkingDirectory=/opt/traffic-collector/api
StandardOutput=inherit
StandardError=inherit
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable traffic-collector
systemctl start traffic-collector
