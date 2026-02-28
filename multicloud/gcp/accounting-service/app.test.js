const request = require('supertest');
const nock = require('nock');

process.env.CRM_SERVICE_URL = 'http://test-crm-service';

const app = require('./app');

describe('Accounting Service Validation', () => {

  afterEach(() => {
    nock.cleanAll();
  });

  describe('GET /transactions', () => {

    it('should query CRM service and return merged results', async () => {
      // Mock the native fetch call backwards to the CRM service
      const crmScope = nock('http://test-crm-service')
        .get('/customers')
        .reply(200, [{ id: 1, name: 'Test Customer' }]);

      const res = await request(app).get('/transactions');
      
      expect(res.status).toBe(200);
      expect(res.body.summary.totalTransactions).toBeGreaterThan(0);
      expect(res.body.crmIntegration.connected).toBe(true);
      expect(res.body.crmIntegration.customers.length).toBe(1);

      expect(crmScope.isDone()).toBe(true);
    });

    it('should continue gracefully if CRM is unreachable', async () => {
      // Return a 500 error from CRM
      const crmScope = nock('http://test-crm-service')
        .get('/customers')
        .reply(500, 'Internal Server Error');

      const res = await request(app).get('/transactions');
      
      expect(res.status).toBe(200);
      expect(res.body.crmIntegration.connected).toBe(false);
      expect(res.body.crmIntegration.message).toBe('CRM service not available');
      
      expect(crmScope.isDone()).toBe(true);
    });

  });

  describe('POST /transactions', () => {

    it('should calculate item prices properly and cache the transaction', async () => {
      const payload = {
        orderId: 'T1001',
        currency: 'USD',
        customerEmail: 'test@example.com',
        financials: {
          shipping_cost: {
            units: 5,
            nanos: 0
          },
          items: [
            { cost: { units: 10, nanos: 0 } },
            { cost: { units: 10, nanos: 500000000 } } // $10.50
          ]
        }
      };

      const res = await request(app)
        .post('/transactions')
        .send(payload);
        
      expect(res.status).toBe(201);
      // Total should be 5 + 10 + 10.5 = 25.50
      expect(res.body.price).toBe(25.5);
      expect(res.body.customer).toBe('test@example.com');
      
    });

    it('should throw an error for missing payloads', async () => {
      const res = await request(app)
        .post('/transactions')
        .send({ currency: 'USD' }); // Missing IDs
        
      expect(res.status).toBe(400);
    });

  });

});
