FROM python:3.11-alpine AS builder

WORKDIR /docs

# Install dependencies
RUN pip install mkdocs-material mkdocs-mermaid2-plugin

# Copy configuration and content
COPY mkdocs.yml .
COPY docs/ docs/

# Build static site
RUN mkdocs build

# Use Nginx to serve the site
FROM nginx:alpine

# Copy built site
COPY --from=builder /docs/site /usr/share/nginx/html

# Update Nginx config to run on port 8080 (Cloud Run default) and support non-root execution
RUN sed -i 's/listen  *80;/listen 8080;/g' /etc/nginx/conf.d/default.conf && \
    sed -i 's/listen  *\[::\]:80;/listen [::]:8080;/g' /etc/nginx/conf.d/default.conf && \
    chmod -R 777 /var/cache/nginx && \
    chmod -R 777 /var/run && \
    chmod -R 777 /etc/nginx/conf.d

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
