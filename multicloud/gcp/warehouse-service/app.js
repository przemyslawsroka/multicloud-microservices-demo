const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON bodies
app.use(express.json());

// Configuration for inventory service
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || '';

// In-memory data store with hardcoded warehouse items
let warehouseItems = [
  { id: 1, name: 'Pizza Margherita', category: 'Italian', price: 12.99, available: true },
  { id: 2, name: 'Sushi Roll', category: 'Japanese', price: 15.99, available: true },
  { id: 3, name: 'Burger Deluxe', category: 'American', price: 10.99, available: true },
  { id: 4, name: 'Pad Thai', category: 'Thai', price: 11.99, available: true },
  { id: 5, name: 'Tacos', category: 'Mexican', price: 9.99, available: true }
];

let nextId = 6;

// Helper function to call inventory service
async function checkInventory() {
  if (!INVENTORY_SERVICE_URL) {
    console.log('Inventory service URL not configured, skipping inventory check');
    return null;
  }

  try {
    console.log(`Calling inventory service at: ${INVENTORY_SERVICE_URL}/inventory`);
    const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    if (!response.ok) {
      throw new Error(`Inventory service returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`Successfully retrieved inventory data: ${data.length} items`);
    return data;
  } catch (error) {
    console.error(`Failed to check inventory: ${error.name} - ${error.message}`);
    console.error(`Error details:`, error);
    return null;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'warehouse-service' });
});

// GET endpoint to list all warehouse items (with inventory check)
app.get('/warehouse', async (req, res) => {
  console.log('GET /warehouse - Returning warehouse items list');
  
  // Call inventory service
  const inventoryData = await checkInventory();
  
  // Prepare response with warehouse items and inventory data
  const response = {
    warehouseItems: warehouseItems,
    inventoryCheck: inventoryData ? {
      checked: true,
      inventoryItems: inventoryData,
      timestamp: new Date().toISOString()
    } : {
      checked: false,
      message: 'Inventory service not available'
    }
  };
  
  res.status(200).json(response);
});

// GET endpoint to get a specific warehouse item by ID
app.get('/warehouse/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = warehouseItems.find(f => f.id === id);
  
  if (!item) {
    console.log(`GET /warehouse/${id} - Not found`);
    return res.status(404).json({ error: 'Warehouse item not found' });
  }
  
  console.log(`GET /warehouse/${id} - Returning item: ${item.name}`);
  res.status(200).json(item);
});

// POST endpoint to add a new warehouse item
app.post('/warehouse', (req, res) => {
  const { name, category, price, available } = req.body;

  if (!name || !category || typeof price !== 'number') {
    console.log('POST /warehouse - Failed: Missing required fields');
    return res.status(400).json({ error: 'Name, category, and price are required' });
  }

  const newItem = {
    id: nextId++,
    name,
    category,
    price,
    available: available !== undefined ? available : true
  };
  
  warehouseItems.push(newItem);
  
  // Cleanup: Keep only the 20 most recent items
  if (warehouseItems.length > 20) {
    const removedCount = warehouseItems.length - 20;
    warehouseItems = warehouseItems.slice(-20);
    console.log(`POST /warehouse - Cleaned up ${removedCount} old item(s), keeping 20 most recent`);
  }
  
  console.log(`POST /warehouse - Added new item: ${name}. Total: ${warehouseItems.length}`);
  res.status(201).json(newItem);
});

// PUT endpoint to update a warehouse item
app.put('/warehouse/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const itemIndex = warehouseItems.findIndex(f => f.id === id);
  
  if (itemIndex === -1) {
    console.log(`PUT /warehouse/${id} - Not found`);
    return res.status(404).json({ error: 'Warehouse item not found' });
  }
  
  const { name, category, price, available } = req.body;
  const updatedItem = {
    ...warehouseItems[itemIndex],
    ...(name && { name }),
    ...(category && { category }),
    ...(price !== undefined && { price }),
    ...(available !== undefined && { available })
  };
  
  warehouseItems[itemIndex] = updatedItem;
  console.log(`PUT /warehouse/${id} - Updated item: ${updatedItem.name}`);
  res.status(200).json(updatedItem);
});

// DELETE endpoint to remove a warehouse item
app.delete('/warehouse/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const itemIndex = warehouseItems.findIndex(f => f.id === id);
  
  if (itemIndex === -1) {
    console.log(`DELETE /warehouse/${id} - Not found`);
    return res.status(404).json({ error: 'Warehouse item not found' });
  }
  
  const deletedItem = warehouseItems.splice(itemIndex, 1)[0];
  console.log(`DELETE /warehouse/${id} - Deleted item: ${deletedItem.name}`);
  res.status(200).json({ message: 'Item deleted', item: deletedItem });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Warehouse service listening on port ${port}`);
});

