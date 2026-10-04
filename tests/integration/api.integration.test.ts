import request from 'supertest';
import { app, pool } from '../../src/api/server';

describe('Subscription Billing API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected and seeded
    // In a real CI/CD environment, we would run migrations/seeds here.
    // For local/Docker testing, the DB is pre-seeded.
  });

  afterAll(async () => {
    // Close database pool connection
    await pool.end();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        database: 'connected'
      });
    });
  });

  describe('POST /api/renew', () => {
    it('should return 400 for missing userId', async () => {
      const response = await request(app)
        .post('/api/renew')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid or missing userId'
      });
    });

    it('should return 400 for empty userId', async () => {
      const response = await request(app)
        .post('/api/renew')
        .send({ userId: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid or missing userId'
      });
    });

    it('should return 400 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/renew')
        .send({ userId: 'user-does-not-exist-999' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'User not found'
      });
    });

    it('should return 400 for active (unexpired) subscription', async () => {
      const response = await request(app)
        .post('/api/renew')
        .send({ userId: 'user-active-001' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Subscription is not yet expired'
      });
    });

    it('should successfully renew an expired subscription', async () => {
      const response = await request(app)
        .post('/api/renew')
        .send({ userId: 'user-expired-001' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Renewal successful'
      });

      // Verify database state was updated
      const subRes = await pool.query('SELECT expires_at FROM subscriptions WHERE user_id = $1', ['user-expired-001']);
      const newExpiry = new Date(subRes.rows[0].expires_at);
      const now = new Date();
      
      // New expiry should be roughly 1 year from now
      expect(newExpiry.getFullYear()).toBe(now.getFullYear() + 1);
    });
  });
});
