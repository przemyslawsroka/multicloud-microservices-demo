const request = require('supertest');
const nock = require('nock');

process.env.ACCOUNTING_SERVICE_URL = 'http://test-accounting-service';
process.env.WAREHOUSE_SERVICE_URL = 'http://test-warehouse-service';

const app = require('./app');

describe('OrderManagement Service Validation', () => {

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should return 400 Bad Request if missing message data', async () => {
    const res = await request(app)
      .post('/')
      .send({ invalid_format: true });

    expect(res.status).toBe(400);
    expect(res.text).toBe('Bad Request');
  });

  it('should process order event and correctly distribute payloads to downstream services', async () => {
    process.env.ACCOUNTING_SERVICE_URL = 'http://test-accounting-service';
    process.env.WAREHOUSE_SERVICE_URL = 'http://test-warehouse-service';

    const orderPayload = {
      order: {
        order_id: '12345-test-order',
        shipping_tracking_id: 'TRACK123',
        shipping_cost: {
          currency_code: 'USD',
          units: 5,
          nanos: 0
        },
        shipping_address: {
          street_address: '1600 Amphitheatre Parkway',
          city: 'Mountain View',
          country: 'USA'
        },
        items: [
          {
            item: {
              product_id: '99LDFM',
              quantity: 2
            },
            cost: {
              currency_code: 'USD',
              units: 10,
              nanos: 0
            }
          }
        ]
      },
      user_currency: 'USD',
      email: 'customer@example.com',
      user_id: 'CUST-001'
    };

    const pubsubBody = {
      message: {
        data: Buffer.from(JSON.stringify(orderPayload)).toString('base64')
      }
    };

    // Verify Accounting integration is modeled properly
    const accountingScope = nock('http://test-accounting-service')
      .post('/transactions', body => {
        expect(body.orderId).toBe('12345-test-order');
        expect(body.currency).toBe('USD');
        expect(body.customerEmail).toBe('customer@example.com');
        return true;
      })
      .reply(201, { success: true });

    // Verify Warehouse integration is modeled properly
    const warehouseScope = nock('http://test-warehouse-service')
      .post('/shipments', body => {
        expect(body.orderId).toBe('12345-test-order');
        expect(body.trackingId).toBe('TRACK123');
        expect(body.items[0].product_id).toBe('99LDFM');
        return true;
      })
      .reply(201, { success: true });

    const res = await request(app)
      .post('/')
      .send(pubsubBody);

    expect(res.status).toBe(200);
    expect(res.text).toBe('Order processed successfully');

    expect(accountingScope.isDone()).toBe(true);
    expect(warehouseScope.isDone()).toBe(true);
  });

  it('should gracefully continue if Accounting responds with an error', async () => {
    process.env.ACCOUNTING_SERVICE_URL = 'http://test-error-accounting-service';
    process.env.WAREHOUSE_SERVICE_URL = ''; // Skip warehouse

    const orderPayload = {
      order: {
        order_id: '99999-error-order',
        items: []
      }
    };

    const pubsubBody = {
      message: {
        data: Buffer.from(JSON.stringify(orderPayload)).toString('base64')
      }
    };

    const accountingScope = nock('http://test-error-accounting-service')
      .post('/transactions')
      .reply(500, { error: 'Internal Error' });

    const res = await request(app)
      .post('/')
      .send(pubsubBody);

    // Order Management should continue and return 200 even if telemetry fails
    expect(res.status).toBe(200);
    expect(accountingScope.isDone()).toBe(true);
  });

});
