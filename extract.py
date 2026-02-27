import os, re

services = ['crm-backend', 'crm-frontend', 'crm-status', 'inventory-service']
base = 'multicloud/gcp'

for srv in services:
    sp = os.path.join(base, srv, 'startup.sh')
    if not os.path.exists(sp):
        continue
    with open(sp, 'r') as f:
        content = f.read()

    # match package.json
    pkg_match = re.search(r"cat <<[\'\"]?EOF[\'\"]? > package\.json\n(.*?)EOF", content, re.DOTALL)
    if pkg_match:
        with open(os.path.join(base, srv, 'package.json'), 'w') as f:
            f.write(pkg_match.group(1))
        content = re.sub(r"cat <<[\'\"]?EOF[\'\"]? > package\.json\n.*?EOF", 
                         "curl -s -H \"Metadata-Flavor: Google\" http://metadata.google.internal/computeMetadata/v1/instance/attributes/package_json > package.json", content, flags=re.DOTALL)

    # match app.js (could be <<APPJS or <<EOFAPP or similar)
    app_match = re.search(r"cat <<[\'\"]?(?:APPJS|EOFAPP)[\'\"]? > app\.js\n(.*?)(?:APPJS|EOFAPP)", content, re.DOTALL)
    if app_match:
        with open(os.path.join(base, srv, 'app.js'), 'w') as f:
            f.write(app_match.group(1))
        content = re.sub(r"cat <<[\'\"]?(?:APPJS|EOFAPP)[\'\"]? > app\.js\n.*?(?:APPJS|EOFAPP)", 
                         "curl -s -H \"Metadata-Flavor: Google\" http://metadata.google.internal/computeMetadata/v1/instance/attributes/app_js > app.js", content, flags=re.DOTALL)

    with open(sp, 'w') as f:
        f.write(content)
