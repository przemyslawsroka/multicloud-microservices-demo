swagger: '2.0'
info:
  title: B2B Partner API
  description: Public B2B API proxying to isolated Partner API Cloud Run Service
  version: 1.0.0
schemes:
  - https
produces:
  - application/json
paths:
  /tracking:
    post:
      summary: Submit Tracking Status
      operationId: postTracking
      x-google-backend:
        address: ${partner_api_url}/tracking
        path_translation: APPEND_PATH_TO_ADDRESS
      responses:
        '200':
          description: Successfully submitted tracking status
  /catalog:
    get:
      summary: Retrieve Product Catalog
      operationId: getCatalog
      x-google-backend:
        address: ${partner_api_url}/catalog
        path_translation: APPEND_PATH_TO_ADDRESS
      responses:
        '200':
          description: Successfully retrieved catalog
