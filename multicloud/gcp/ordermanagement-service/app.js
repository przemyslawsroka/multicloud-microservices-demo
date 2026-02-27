const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;
const ACCOUNTING_SERVICE_URL = process.env.ACCOUNTING_SERVICE_URL;
const WAREHOUSE_SERVICE_URL = process.env.WAREHOUSE_SERVICE_URL;

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
    
    console.log(`[OMS] Processing OrderConfirmedEvent for OrderID: ${orderEvent.orderId}`);

    // Native Node v18+ fetch is used here
    if (ACCOUNTING_SERVICE_URL) {
      console.log(`[OMS -> Accounting] Dispatching financial payload`);
      try {
        const accRes = await fetch(`${ACCOUNTING_SERVICE_URL}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderEvent.orderId,
            amount: orderEvent.totalAmount,
            currency: orderEvent.currency,
            customerEmail: orderEvent.customerEmail
          })
        });
        if (!accRes.ok) console.error(`[Accounting Error] HTTP ${accRes.status}`);
      } catch (err) {
        console.error(`[Accounting Ext-Error] ${err.message}`);
      }
    }

    if (WAREHOUSE_SERVICE_URL) {
      console.log(`[OMS -> Warehouse] Dispatching logistics payload`);
      try {
        const warRes = await fetch(`${WAREHOUSE_SERVICE_URL}/shipments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderEvent.orderId,
            items: orderEvent.items,
            destination: orderEvent.customerEmail
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

app.listen(PORT, () => {
  console.log(`OrderManagement service running on port ${PORT}`);
});
