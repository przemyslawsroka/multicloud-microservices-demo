const request = require('supertest');
const app = require('./app');

describe('Inventory Service Validation', () => {

  describe('GET /inventory', () => {
    it('should return initial inventory items', async () => {
      const res = await request(app).get('/inventory');
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('code');
      expect(res.body[0]).toHaveProperty('count');
    });
  });

  describe('POST /inventory', () => {
    
    it('should add a new inventory item and assign a default count', async () => {
      const payload = {
        name: 'Keyboard',
        code: 'TECH-003'
      };

      const res = await request(app)
        .post('/inventory')
        .send(payload);
        
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Keyboard');
      expect(res.body.count).toBe(1);
    });

    it('should increment the count of an existing inventory item', async () => {
      const initRes = await request(app).get('/inventory');
      const startCount = initRes.body.find(i => i.code === 'TECH-001').count;

      const payload = {
        name: 'Laptop',
        code: 'TECH-001'
      };

      const res = await request(app)
        .post('/inventory')
        .send(payload);
        
      expect(res.status).toBe(201);
      expect(res.body.count).toBe(startCount + 1);
    });

    it('should return a 400 error for missing payloads', async () => {
      const res = await request(app)
        .post('/inventory')
        .send({ name: 'Mouse' });
        
      expect(res.status).toBe(400);
    });

  });

});
