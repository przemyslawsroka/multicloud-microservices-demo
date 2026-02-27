const express = require('express');
const { Storage } = require('@google-cloud/storage');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const port = process.env.PORT || 8080;

// Initialize Google Cloud Storage only in production
let storage, bucket;
if (process.env.NODE_ENV === 'production') {
  storage = new Storage();
  const BUCKET_NAME = 'crm-online-boutique-bucket';
  bucket = storage.bucket(BUCKET_NAME);
}

// Async logging function
async function logToGCS(logEntry) {
  if (!bucket) return;
  try {
    const date = new Date().toISOString().split('T')[0];
    const fileName = `logs/${date}/${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
    await bucket.file(fileName).save(JSON.stringify(logEntry, null, 2));
  } catch (error) {
    console.error('Failed to write log to GCS:', error.message);
  }
}

// Database Connection Support (CloudSQL or In-Memory SQLite)
let sequelize;
if (process.env.DB_HOST) {
  console.log(`Connecting to CloudSQL MySQL at ${process.env.DB_HOST}`);
  sequelize = new Sequelize(
    process.env.DB_NAME || 'crm',
    process.env.DB_USER || 'crm_user',
    process.env.DB_PASS || 'password123',
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: false
    }
  );
} else {
  console.log('Using lightweight local SQLite database (in-memory)');
  sequelize = new Sequelize('sqlite::memory:', { logging: false });
}

// Define Customer Model
const Customer = sequelize.define('Customer', {
  name: { type: DataTypes.STRING, allowNull: false },
  surname: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING }
});

const Order = sequelize.define('Order', {
  orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
  trackingId: { type: DataTypes.STRING },
  shippingCost: { type: DataTypes.FLOAT },
  totalAmount: { type: DataTypes.FLOAT },
  currency: { type: DataTypes.STRING }
});

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

Customer.hasMany(Order);
Order.belongsTo(Customer);

// Sync database and seed initial data
sequelize.sync().then(async () => {
  const count = await Customer.count();
  if (count === 0) {
    await Customer.bulkCreate([
      { name: 'John', surname: 'Doe' },
      { name: 'Jane', surname: 'Smith' },
      { name: 'Alice', surname: 'Johnson' }
    ]);
    console.log('Seeded database with initial customers.');
  }
}).catch(err => {
  console.error('Database connection failed:', err);
});

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.get('user-agent') || 'unknown'
    };
    logToGCS(logEntry).catch(err => console.error('Logging error:', err));
  });
  next();
});

// REST API Endpoints

app.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      include: [Order],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/customers', async (req, res) => {
  const { name, surname, email, address, order } = req.body;

  // If email is provided, we use it to find existing
  if (email) {
    try {
      let customer = await Customer.findOne({ where: { email } });
      if (!customer) {
        customer = await Customer.create({ name, surname, email, address });
      } else {
        await customer.update({ name, surname, address });
      }

      if (order && order.orderId) {
        await Order.findOrCreate({
          where: { orderId: order.orderId },
          defaults: {
            trackingId: order.trackingId,
            shippingCost: order.shippingCost,
            totalAmount: order.totalAmount,
            currency: order.currency,
            CustomerId: customer.id
          }
        });
      }
      return res.status(201).json(customer);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Fallback for basic inserts without email
  if (!name || !surname) {
    return res.status(400).json({ error: 'Name and surname are required.' });
  }
  try {
    const newCustomer = await Customer.create({ name, surname, address });
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/customers/:id', async (req, res) => {
  const { name, surname } = req.body;
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (name) customer.name = name;
    if (surname) customer.surname = surname;
    await customer.save();

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await customer.destroy();
    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders Endpoints
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [Customer],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/orders', async (req, res) => {
  const { orderId, trackingId, shippingCost, totalAmount, currency, CustomerId } = req.body;
  if (!orderId || !CustomerId) {
    return res.status(400).json({ error: 'Order ID and Customer ID are required.' });
  }
  try {
    const newOrder = await Order.create({ orderId, trackingId, shippingCost, totalAmount, currency, CustomerId });
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await order.destroy();
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats Endpoint
app.get('/stats', async (req, res) => {
  try {
    const customerCount = await Customer.count();
    const orderCount = await Order.count();
    const totalRevenue = await Order.sum('totalAmount') || 0;

    res.status(200).json({
      customers: customerCount,
      orders: orderCount,
      revenue: totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MCP Server Integration (Agent Gateway)
// ==========================================
const mcpServer = new Server({ name: "crm-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "lookup_customer",
      description: "Lookup a customer and their lifetime revenue by first and last name.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          surname: { type: "string" }
        },
        required: ["name", "surname"]
      }
    },
    {
      name: "find_order",
      description: "Find an order object by its internal tracking ID to check its status or value.",
      inputSchema: {
        type: "object",
        properties: {
          trackingId: { type: "string" }
        },
        required: ["trackingId"]
      }
    }
  ]
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "lookup_customer") {
      const { name, surname } = request.params.arguments;
      const c = await Customer.findOne({ where: { name, surname }, include: [Order] });
      if (!c) return { content: [{ type: "text", text: `Customer ${name} ${surname} not found.` }] };
      const totalSpent = c.Orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
      return {
        content: [{
          type: "text", text: JSON.stringify({
            id: c.id, email: c.email, address: c.address, lifetimeRevenue: totalSpent, ordersCount: c.Orders.length
          })
        }]
      };
    }
    if (request.params.name === "find_order") {
      const { trackingId } = request.params.arguments;
      const o = await Order.findOne({ where: { trackingId }, include: [Customer] });
      if (!o) return { content: [{ type: "text", text: `Order with tracking ID ${trackingId} not found.` }] };
      return {
        content: [{
          type: "text", text: JSON.stringify({
            orderId: o.orderId, trackingId: o.trackingId, totalAmount: o.totalAmount, currency: o.currency,
            customerName: o.Customer.name + ' ' + o.Customer.surname
          })
        }]
      };
    }
    throw new Error("Unknown tool");
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: e.message }] };
  }
});

let transport;
app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  await mcpServer.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send("MCP Server not active");
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`CRM Backend server listening on port ${port}`);
});
