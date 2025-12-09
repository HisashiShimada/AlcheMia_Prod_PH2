// Test setup file for Jest
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'mmdpf_test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

// Setup global test timeout
jest.setTimeout(10000);
