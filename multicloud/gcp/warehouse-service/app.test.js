const request = require('supertest');
const nock = require('nock');

process.env.INVENTORY_SERVICE_URL = 'http://test-inventory-service';

const app = require('./app');

describe('Warehouse Service Validation', () => {

  afterEach(() => {
    nock.cleanAll();
  });

  describe('GET /warehouse', () => {

    it('should query inventory service and return merged results', async () => {
      // Mock the native fetch call backwards to the inventory service
      const invScope = nock('http://test-inventory-service')
        .get('/inventory')
        .reply(200, [{ id: 1, stock: 45 }]);

      const res = await request(app).get('/warehouse');

      expect(res.status).toBe(200);
      expect(res.body.warehouseItems.length).toBeGreaterThan(0);
      expect(res.body.inventoryCheck.checked).toBe(true);
      expect(res.body.inventoryCheck.inventoryItems.length).toBe(1);

      expect(invScope.isDone()).toBe(true);
    });

    it('should continue gracefully if inventory is unreachable', async () => {
      // Return a 500 error from inventory
      const invScope = nock('http://test-inventory-service')
        .get('/inventory')
        .reply(500, 'Internal Server Error');

      const res = await request(app).get('/warehouse');

      expect(res.status).toBe(200);
      expect(res.body.inventoryCheck.checked).toBe(false);
      expect(res.body.inventoryCheck.message).toBe('Inventory service not available');

      expect(invScope.isDone()).toBe(true);
    });

  });

  describe('POST /warehouse', () => {

    it('should process new items and allocate a correct ID', async () => {
      const payload = {
        name: 'New Lamp',
        category: 'Lighting',
        price: 49.99,
        available: true
      };

      const res = await request(app)
        .post('/warehouse')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Lamp');
      // ID was auto generated
      expect(res.body.id).toBeGreaterThan(5);
    });

    it('should block bad requests missing the name', async () => {
      const res = await request(app)
        .post('/warehouse')
        .send({ price: 49.99 });

      expect(res.status).toBe(400);
    });

  });

});
