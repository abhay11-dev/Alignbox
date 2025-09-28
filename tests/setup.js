// Test setup file
const { pool, closePool } = require('../config/database');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DB_NAME = 'chat_app_test';

// Global test timeout
jest.setTimeout(10000);

// Setup before all tests
beforeAll(async () => {
    // Test database connection
    try {
        await pool.execute('SELECT 1');
        console.log('✅ Test database connected');
    } catch (error) {
        console.error('❌ Test database connection failed:', error.message);
        process.exit(1);
    }
});

// Cleanup after all tests
afterAll(async () => {
    try {
        await closePool();
        console.log('✅ Test database connection closed');
    } catch (error) {
        console.error('❌ Error closing test database:', error.message);
    }
});

// Clean up after each test
afterEach(async () => {
    // Clean up test data
    try {
        await pool.execute('DELETE FROM message_status');
        await pool.execute('DELETE FROM messages');
        await pool.execute('DELETE FROM group_members');
        await pool.execute('DELETE FROM groups');
        await pool.execute('DELETE FROM users');
        await pool.execute('DELETE FROM user_sessions');
        await pool.execute('DELETE FROM file_uploads');
    } catch (error) {
        console.error('Error cleaning up test data:', error.message);
    }
});

// Mock console methods in tests to reduce noise
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

