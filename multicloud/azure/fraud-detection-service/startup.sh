#!/bin/bash

sudo apt-get update
sudo apt-get install -y nodejs npm
sudo npm install pm2 -g

sudo mkdir -p /opt/app
sudo chown -R azureuser:azureuser /opt/app
cd /opt/app

cat <<'EOF' > package.json
{
  "name": "mock-fraud-detection-service",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": { "express": "^4.18.2" }
}
EOF

cat <<'EOF' > app.js
const express = require('express');
const app = express();
const port = 8080;

app.use(express.json());

// In-memory data store with two mocked risk signals
let riskSignals = [
  { transactionType: 'user_login', durationMs: 85, success: true, riskScore: 'LOW', timestamp: '2025-07-21T07:15:00Z' },
  { transactionType: 'payment_processing', durationMs: 210, success: false, riskScore: 'HIGH', timestamp: '2025-07-21T07:16:30Z' }
];

// POST endpoint to save a new transaction risk signal
app.post('/metrics', (req, res) => {
  const { transactionType, durationMs, success } = req.body;

  if (typeof transactionType !== 'string' || typeof durationMs !== 'number' || typeof success !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload. Required fields: transactionType (string), durationMs (number), success (boolean).' });
  }

  // Simple mock logic: failed transactions or slow transactions get higher risk scores
  const riskScore = (!success || durationMs > 500) ? 'HIGH' : (durationMs > 200 ? 'MEDIUM' : 'LOW');

  const newSignal = { 
    transactionType, 
    durationMs, 
    success,
    riskScore,
    timestamp: new Date().toISOString() // Add server-side timestamp
  };
  riskSignals.push(newSignal);
  
  // Cleanup: Keep only the 10 most recent risk signals
  if (riskSignals.length > 10) {
    const removedCount = riskSignals.length - 10;
    riskSignals = riskSignals.slice(-10); // Keep last 10
    console.log(`POST /metrics - Cleaned up ${removedCount} old signal(s), keeping 10 most recent`);
  }
  
  console.log(`POST /metrics - Analyzed new transaction for ${transactionType} (${durationMs}ms) => Risk: ${riskScore}. Total records: ${riskSignals.length}`);
  res.status(201).json(newSignal);
});

// GET endpoint to list all risk signals and a summary
app.get('/metrics', (req, res) => {
  if (riskSignals.length === 0) {
    return res.status(200).json({ summary: { totalTransactionsEvaluated: 0 }, data: [] });
  }

  const summary = {
    totalTransactionsEvaluated: riskSignals.length,
    highRiskCount: riskSignals.filter(m => m.riskScore === 'HIGH').length,
    lowRiskCount: riskSignals.filter(m => m.riskScore === 'LOW').length,
    averageDurationMs: Math.round(riskSignals.reduce((acc, m) => acc + m.durationMs, 0) / riskSignals.length)
  };
  
  console.log('GET /metrics - Returning fraud analysis summary and data');
  res.status(200).json({ summary, data: riskSignals });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Mock Fraud Detection Engine listening on port ${port}`);
});
EOF

npm install
pm2 start app.js --name "fraud-engine-app"
