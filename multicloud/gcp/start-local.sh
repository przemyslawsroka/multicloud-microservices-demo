#!/bin/bash
set -e

echo "Starting CRM local testing environment..."

# 1. Start CRM Backend
echo "Installing dependencies for CRM Backend..."
cd crm-backend
npm install
echo "Starting CRM Backend on port 8080..."
PORT=8080 node app.js > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 2. Start CRM Frontend 
echo "Installing dependencies for CRM Frontend..."
cd crm-frontend
npm install
echo "Starting CRM Frontend on port 8081..."
PORT=8081 BACKEND_URL="http://localhost:8080/customers" node app.js > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 3. Start CRM Status
echo "Installing dependencies for CRM Status..."
cd crm-status
npm install
echo "Starting CRM Status on port 8082..."
PORT=8082 BACKEND_URL="http://localhost:8080/customers" node app.js > status.log 2>&1 &
STATUS_PID=$!
cd ..

echo "========================================="
echo "All services started successfully!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Status PID: $STATUS_PID"
echo "========================================="
echo "Access your local services here:"
echo " - CRM Backend API: http://localhost:8080/customers"
echo " - CRM Frontend UI: http://localhost:8081"
echo " - CRM Status UI:   http://localhost:8082"
echo ""
echo "To stop all services, run: kill $BACKEND_PID $FRONTEND_PID $STATUS_PID"
echo "========================================="
