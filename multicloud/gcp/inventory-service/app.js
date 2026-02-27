const express = require('express');
const app = express();
const port = 8080;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory data store with some initial items
let items = [
  { name: 'Laptop', code: 'TECH-001', count: 50 },
  { name: 'Desk Chair', code: 'FURN-001', count: 25 },
  { name: 'Monitor', code: 'TECH-002', count: 100 }
];

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('GET /health - Health check');
  res.status(200).json({ status: 'healthy', service: 'inventory-service' });
});

// GET endpoint to list all items
app.get('/inventory', (req, res) => {
  console.log('GET /inventory - Returning items list');
  res.status(200).json(items);
});

// POST endpoint to add a new item
app.post('/inventory', (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    console.log('POST /inventory - Failed: Missing name or code');
    return res.status(400).json({ error: 'Name and code are required.' });
  }

  const index = items.findIndex(el => el.code === code);
  let updatedItem;

  if (index > -1) {
    items[index].count++;
    updatedItem = items[index];
    console.log('POST /inventory - Updated existing item: ' + name + ' ' + code + '. Count: ' + items[index].count);
  } else {
    updatedItem = { name, code, count: 1 };
    items.push(updatedItem);
    console.log('POST /inventory - Added new item: ' + name + ' ' + code + '. Total items: ' + items.length);
  }

  // Cleanup: Keep only the 50 most recent items
  if (items.length > 50) {
    const removedCount = items.length - 50;
    items = items.slice(-50);
    console.log('POST /inventory - Cleaned up ' + removedCount + ' old item(s), keeping 50 most recent');
  }

  res.status(201).json(updatedItem);
});

app.listen(port, '0.0.0.0', () => {
  console.log('Inventory service listening on port ' + port);
  console.log('Initial inventory: ' + items.length + ' items');
});
