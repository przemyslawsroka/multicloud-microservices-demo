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
});

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
    const customers = await Customer.findAll();
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/customers', async (req, res) => {
  const { name, surname } = req.body;
  if (!name || !surname) {
    return res.status(400).json({ error: 'Name and surname are required.' });
  }
  try {
    const newCustomer = await Customer.create({ name, surname });
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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`CRM Backend server listening on port ${port}`);
});
