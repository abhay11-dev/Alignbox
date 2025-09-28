const request = require('supertest');
const bcrypt = require('bcrypt');
const { app } = require('../server');
const { pool } = require('../config/database');

describe('Authentication Routes', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                displayName: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe(userData.username);
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.user.displayName).toBe(userData.displayName);
        });

        it('should fail with invalid email format', async () => {
            const userData = {
                username: 'testuser2',
                email: 'invalid-email',
                password: 'TestPassword123!',
                displayName: 'Test User 2'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body).toHaveProperty('details');
        });

        it('should fail with weak password', async () => {
            const userData = {
                username: 'testuser3',
                email: 'test3@example.com',
                password: 'weak',
                displayName: 'Test User 3'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        it('should fail with duplicate username', async () => {
            // First registration
            const userData = {
                username: 'duplicateuser',
                email: 'duplicate1@example.com',
                password: 'TestPassword123!',
                displayName: 'Duplicate User 1'
            };

            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            // Second registration with same username
            const duplicateData = {
                username: 'duplicateuser',
                email: 'duplicate2@example.com',
                password: 'TestPassword123!',
                displayName: 'Duplicate User 2'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(duplicateData)
                .expect(409);

            expect(response.body).toHaveProperty('error', 'Username or email already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['logintest', 'logintest@example.com', hashedPassword, 'Login Test User']
            );
        });

        it('should login with valid credentials', async () => {
            const loginData = {
                username: 'logintest',
                password: 'TestPassword123!'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe('logintest');
        });

        it('should login with email instead of username', async () => {
            const loginData = {
                username: 'logintest@example.com',
                password: 'TestPassword123!'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body.user.username).toBe('logintest');
        });

        it('should fail with invalid username', async () => {
            const loginData = {
                username: 'nonexistent',
                password: 'TestPassword123!'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid credentials');
            expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
        });

        it('should fail with invalid password', async () => {
            const loginData = {
                username: 'logintest',
                password: 'WrongPassword123!'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid credentials');
            expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
        });

        it('should fail with missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken;
        let userId;

        beforeEach(async () => {
            // Create a test user and get token
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['metest', 'metest@example.com', hashedPassword, 'Me Test User']
            );
            userId = result.insertId;

            // Login to get token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'metest',
                    password: 'TestPassword123!'
                });

            authToken = loginResponse.body.token;
        });

        it('should get current user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe('metest');
            expect(response.body.user.email).toBe('metest@example.com');
            expect(response.body.user.displayName).toBe('Me Test User');
        });

        it('should fail without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Access token required');
            expect(response.body).toHaveProperty('code', 'NO_TOKEN');
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid token');
            expect(response.body).toHaveProperty('code', 'INVALID_TOKEN');
        });
    });
});

