import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Interface for 3PL tracking request
interface TrackingRequest {
  trackingId: string;
  status: string;
  location: string;
  timestamp: string;
}

// Interface for B2B Product Catalog
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// POST /tracking - Receive updates from 3PLs
app.post('/tracking', (req: Request, res: Response) => {
  const data = req.body as TrackingRequest;

  if (!data.trackingId || !data.status) {
    return res.status(400).json({ error: 'Missing trackingId or status' });
  }

  // In a real scenario, this would publish an event to Pub/Sub or update a backend DB
  console.log(`[Partner API -> Proxy Secure] Received 3PL tracking update: ${data.trackingId} is ${data.status} at ${data.location || 'Unknown'}`);

  return res.status(200).send(`Tracking update registered successfully for ${data.trackingId}`);
});

// GET /catalog - Serve catalog to B2B resellers
app.get('/catalog', (req: Request, res: Response) => {
  // Mock B2B catalog response
  const catalog: Product[] = [
    { id: "p-100", name: "Multi-Cloud Developer Desk", price: 799.99, stock: 15 },
    { id: "p-101", name: "Standing Logic Board", price: 399.50, stock: 42 },
    { id: "p-102", name: "Ergonomic Server Rack", price: 450.00, stock: 5 }
  ];

  console.log(`[Partner API -> Proxy Secure] Serving B2B catalog to partner network`);

  return res.status(200).json(catalog);
});

// GET /health - Readiness probe
app.get('/health', (req: Request, res: Response) => {
  return res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Partner API service (TypeScript) listening on port ${PORT}`);
});
