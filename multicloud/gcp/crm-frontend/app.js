const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

let EXTERNAL_BACKEND_URL = process.env.BACKEND_URL || 'http://10.3.0.2:8080';
if (EXTERNAL_BACKEND_URL.endsWith('/customers')) {
    EXTERNAL_BACKEND_URL = EXTERNAL_BACKEND_URL.replace('/customers', '');
}

app.use(express.json());
app.use(cors());

// Serve the static frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy API routes to backend
app.all('/api/*', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const targetPath = req.path.replace('/api', ''); // e.g., /customers, /orders, /stats
        const targetUrl = `${EXTERNAL_BACKEND_URL}${targetPath}`;

        const fetchOptions = {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && Object.keys(req.body).length > 0) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('API Proxy Error:', error);
        res.status(500).json({ error: 'Gateway Proxy Error. Make sure backend is running.' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', backendUrl: EXTERNAL_BACKEND_URL });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`CRM Frontend server listening on port ${port}`);
});
