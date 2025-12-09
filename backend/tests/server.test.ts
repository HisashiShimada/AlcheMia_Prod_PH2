import request from 'supertest';
import app from '../src/server';

describe('Backend Server', () => {
  describe('GET /', () => {
    it('should return server information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'MMDPF Backend API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });

    it('should return valid timestamp', async () => {
      const response = await request(app).get('/api/health');
      const timestamp = new Date(response.body.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
