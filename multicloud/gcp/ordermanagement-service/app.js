const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;

// Eventarc triggers Cloud Run with JSON body
app.use(express.json());

app.post('/', async (req, res) => {
  if (!req.body || !req.body.message || !req.body.message.data) {
    console.error('Bad Request: Invalid Eventarc/PubSub message format');
    return res.status(400).send('Bad Request');
  }

  try {
    const pubsubData = req.body.message.data;
    const decodedData = Buffer.from(pubsubData, 'base64').toString('utf-8');
    const orderEvent = JSON.parse(decodedData);
    
    console.log(`[OMS] Processing OrderConfirmedEvent for OrderID: ${orderEvent.order.order_id}`);

    // Native Node v18+ fetch is used here
    const ACCOUNTING_SERVICE_URL = process.env.ACCOUNTING_SERVICE_URL;
    if (ACCOUNTING_SERVICE_URL) {
      console.log(`[OMS -> Accounting] Dispatching financial payload`);
      try {
        const accRes = await fetch(`${ACCOUNTING_SERVICE_URL}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderEvent.order.order_id,
            financials: {
              items: orderEvent.order.items,
              shipping_cost: orderEvent.order.shipping_cost
            },
            currency: orderEvent.user_currency,
            customerEmail: orderEvent.email,
            userId: orderEvent.user_id
          })
        });
        if (!accRes.ok) console.error(`[Accounting Error] HTTP ${accRes.status}`);
      } catch (err) {
        console.error(`[Accounting Ext-Error] ${err.message}`);
      }
    }

    const WAREHOUSE_SERVICE_URL = process.env.WAREHOUSE_SERVICE_URL;
    if (WAREHOUSE_SERVICE_URL) {
      console.log(`[OMS -> Warehouse] Dispatching logistics payload`);
      try {
        const warRes = await fetch(`${WAREHOUSE_SERVICE_URL}/shipments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderEvent.order.order_id,
            trackingId: orderEvent.order.shipping_tracking_id,
            items: orderEvent.order.items.map(i => ({ product_id: i.item.product_id, quantity: i.item.quantity })),
            destinationAddress: orderEvent.order.shipping_address
          })
        });
        if (!warRes.ok) console.error(`[Warehouse Error] HTTP ${warRes.status}`);
      } catch (err) {
        console.error(`[Warehouse Ext-Error] ${err.message}`);
      }
    }

    res.status(200).send('Order processed successfully');
  } catch (err) {
    console.error('[OMS Error] Failed to parse and route order:', err);
    res.status(500).send('Internal Processing Error');
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`OrderManagement service running on port ${PORT}`);
  });
}

module.exports = app;
