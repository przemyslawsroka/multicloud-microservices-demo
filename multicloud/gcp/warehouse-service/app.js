const express = require('express');
const { BigQuery } = require('@google-cloud/bigquery');
const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON bodies
app.use(express.json());


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
  const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || '';
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

// Initialize BigQuery Client
const bigquery = new BigQuery();
const BQ_DATASET = 'enterprise_data_lake';
const BQ_TABLE = 'order_events';

// POST endpoint for ordermanagement shipments (Synchronous checkoutservice call)
app.post('/shipments', async (req, res) => {
  const { orderId, email, currency, trackingId, shippingCost, items, destinationAddress } = req.body;

  if (!orderId || !items) {
    console.log('POST /shipments - Failed: Missing orderId or items');
    return res.status(400).json({ error: 'Order ID and items are required' });
  }

  console.log(`POST /shipments - Processing Order ${orderId}`);

  try {
    // Construct the exact BigQuery row
    const row = {
      order_id: orderId,
      user_id: req.body.userId || null,
      email: email || null,
      user_currency: currency || null,
      shipping_tracking_id: trackingId || null,
      shipping_cost: shippingCost ? {
        currency_code: shippingCost.currencyCode || shippingCost.currency_code || 'USD',
        units: shippingCost.units || 0,
        nanos: shippingCost.nanos || 0
      } : null,
      shipping_address: destinationAddress ? {
        street_address: destinationAddress.streetAddress || destinationAddress.street_address || null,
        city: destinationAddress.city || null,
        state: destinationAddress.state || null,
        country: destinationAddress.country || null,
        zip_code: destinationAddress.zipCode || destinationAddress.zip_code || null
      } : null,
      items: items.map(i => ({
        item: i.item ? {
          product_id: i.item.productId || i.item.product_id,
          quantity: i.item.quantity || 1
        } : null,
        cost: i.cost ? {
          currency_code: i.cost.currencyCode || i.cost.currency_code || 'USD',
          units: i.cost.units || 0,
          nanos: i.cost.nanos || 0
        } : null
      }))
    };

    console.log(`[Warehouse Event] Storing warehouse event in BigQuery (${BQ_TABLE})`);

    // Insert into BigQuery
    await bigquery.dataset(BQ_DATASET).table(BQ_TABLE).insert([row]);
    console.log(`[Warehouse Event] Successfully inserted ${orderId} into BQ`);

    res.status(201).json({
      message: 'Shipment scheduled successfully',
      shipmentDetails: {
        orderId,
        trackingId: trackingId || 'N/A',
        status: 'pending_fulfillment'
      }
    });

  } catch (err) {
    console.error('[Warehouse Error] Failed to process shipment / insert to BQ:', err);
    // Print BQ validation errors if they exist
    if (err && err.name === 'PartialFailureError') {
      err.errors.forEach(e => {
        console.error('BigQuery insert error:', JSON.stringify(e));
      });
    }

    // Still return 201 so checkoutservice order doesn't fail due to analytics logging failure
    res.status(201).json({
      message: 'Shipment accepted but analytics logging failed',
      error: err.message
    });
  }
});

if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Warehouse service listening on port ${port}`);
    console.log(`Initial items: ${warehouseItems.length}`);
  });
}

module.exports = app;
