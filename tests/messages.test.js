const request = require('supertest');
const bcrypt = require('bcrypt');
const { app } = require('../server');
const { pool } = require('../config/database');

describe('Messages Routes', () => {
    let authToken;
    let userId;
    let groupId;
    let messageId;

    beforeEach(async () => {
        // Create a test user and get token
        const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
            ['messagetest', 'messagetest@example.com', hashedPassword, 'Message Test User']
        );
        userId = result.insertId;

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'messagetest',
                password: 'TestPassword123!'
            });

        authToken = loginResponse.body.token;

        // Create a test group
        const [groupResult] = await pool.execute(
            'INSERT INTO groups (name, description, created_by, max_members) VALUES (?, ?, ?, ?)',
            ['Test Group for Messages', 'A group for testing messages', userId, 50]
        );
        groupId = groupResult.insertId;

        // Add user as member
        await pool.execute(
            'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
            [groupId, userId, 'admin']
        );
    });

    describe('POST /api/messages/:groupId', () => {
        it('should send a message successfully', async () => {
            const messageData = {
                content: 'Hello, this is a test message!',
                isAnonymous: false
            };

            const response = await request(app)
                .post(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(messageData)
                .expect(201);

            expect(response.body).toHaveProperty('content', messageData.content);
            expect(response.body).toHaveProperty('is_anonymous', messageData.isAnonymous);
            expect(response.body).toHaveProperty('group_id', groupId);
            expect(response.body).toHaveProperty('user_id', userId);
            expect(response.body).toHaveProperty('username', 'messagetest');

            messageId = response.body.id;
        });

        it('should send an anonymous message successfully', async () => {
            const messageData = {
                content: 'This is an anonymous message!',
                isAnonymous: true
            };

            const response = await request(app)
                .post(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(messageData)
                .expect(201);

            expect(response.body).toHaveProperty('content', messageData.content);
            expect(response.body).toHaveProperty('is_anonymous', true);
            expect(response.body).toHaveProperty('group_id', groupId);
        });

        it('should fail with empty content', async () => {
            const messageData = {
                content: '',
                isAnonymous: false
            };

            const response = await request(app)
                .post(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(messageData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        it('should fail with content too long', async () => {
            const longContent = 'a'.repeat(2001); // Exceeds 2000 character limit
            const messageData = {
                content: longContent,
                isAnonymous: false
            };

            const response = await request(app)
                .post(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(messageData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        it('should fail for non-member', async () => {
            // Create another user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['otheruser', 'other@example.com', hashedPassword, 'Other User']
            );

            // Login as other user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'otheruser',
                    password: 'TestPassword123!'
                });

            const otherToken = loginResponse.body.token;

            const messageData = {
                content: 'Unauthorized message',
                isAnonymous: false
            };

            const response = await request(app)
                .post(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send(messageData)
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied: Not a member of this group');
            expect(response.body).toHaveProperty('code', 'NOT_MEMBER');
        });
    });

    describe('GET /api/messages/:groupId', () => {
        beforeEach(async () => {
            // Create some test messages
            await pool.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)',
                [groupId, userId, 'First message', false, new Date(Date.now() - 60000)]
            );

            await pool.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)',
                [groupId, userId, 'Second message', true, new Date(Date.now() - 30000)]
            );

            await pool.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)',
                [groupId, userId, 'Third message', false, new Date()]
            );
        });

        it('should get group messages successfully', async () => {
            const response = await request(app)
                .get(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);
            expect(response.body[0]).toHaveProperty('content', 'First message');
            expect(response.body[1]).toHaveProperty('content', 'Second message');
            expect(response.body[2]).toHaveProperty('content', 'Third message');
        });

        it('should get messages with pagination', async () => {
            const response = await request(app)
                .get(`/api/messages/${groupId}?limit=2&offset=0`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should fail for non-member', async () => {
            // Create another user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['otheruser', 'other@example.com', hashedPassword, 'Other User']
            );

            // Login as other user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'otheruser',
                    password: 'TestPassword123!'
                });

            const otherToken = loginResponse.body.token;

            const response = await request(app)
                .get(`/api/messages/${groupId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied: Not a member of this group');
            expect(response.body).toHaveProperty('code', 'NOT_MEMBER');
        });
    });

    describe('PUT /api/messages/:groupId/:messageId', () => {
        beforeEach(async () => {
            // Create a test message
            const [result] = await pool.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous) VALUES (?, ?, ?, ?)',
                [groupId, userId, 'Original message content', false]
            );
            messageId = result.insertId;
        });

        it('should edit message successfully', async () => {
            const updateData = {
                content: 'Updated message content'
            };

            const response = await request(app)
                .put(`/api/messages/${groupId}/${messageId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('content', updateData.content);
            expect(response.body).toHaveProperty('is_edited', true);

            // Verify the update in database
            const [messages] = await pool.execute('SELECT * FROM messages WHERE id = ?', [messageId]);
            expect(messages[0].content).toBe(updateData.content);
            expect(messages[0].is_edited).toBe(true);
        });

        it('should fail for non-owner', async () => {
            // Create another user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['otheruser', 'other@example.com', hashedPassword, 'Other User']
            );
            const otherUserId = result.insertId;

            // Add other user to group
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, otherUserId, 'member']
            );

            // Login as other user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'otheruser',
                    password: 'TestPassword123!'
                });

            const otherToken = loginResponse.body.token;

            const updateData = {
                content: 'Unauthorized edit attempt'
            };

            const response = await request(app)
                .put(`/api/messages/${groupId}/${messageId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send(updateData)
                .expect(403);

            expect(response.body).toHaveProperty('error', 'You can only edit your own messages');
            expect(response.body).toHaveProperty('code', 'NOT_MESSAGE_OWNER');
        });

        it('should fail with empty content', async () => {
            const updateData = {
                content: ''
            };

            const response = await request(app)
                .put(`/api/messages/${groupId}/${messageId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Message content is required');
            expect(response.body).toHaveProperty('code', 'MISSING_CONTENT');
        });
    });

    describe('DELETE /api/messages/:groupId/:messageId', () => {
        beforeEach(async () => {
            // Create a test message
            const [result] = await pool.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous) VALUES (?, ?, ?, ?)',
                [groupId, userId, 'Message to be deleted', false]
            );
            messageId = result.insertId;
        });

        it('should delete message successfully', async () => {
            const response = await request(app)
                .delete(`/api/messages/${groupId}/${messageId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Message deleted successfully');

            // Verify soft deletion in database
            const [messages] = await pool.execute('SELECT * FROM messages WHERE id = ?', [messageId]);
            expect(messages[0].is_deleted).toBe(true);
        });

        it('should fail for non-owner', async () => {
            // Create another user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['otheruser', 'other@example.com', hashedPassword, 'Other User']
            );
            const otherUserId = result.insertId;

            // Add other user to group
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, otherUserId, 'member']
            );

            // Login as other user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'otheruser',
                    password: 'TestPassword123!'
                });

            const otherToken = loginResponse.body.token;

            const response = await request(app)
                .delete(`/api/messages/${groupId}/${messageId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('error', 'You can only delete your own messages');
            expect(response.body).toHaveProperty('code', 'NOT_MESSAGE_OWNER');
        });
    });

    describe('POST /api/messages/:groupId/:messageId/read', () => {
        beforeEach(async () => {
            // Create a test message
            const [result] = await pool.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous) VALUES (?, ?, ?, ?)',
                [groupId, userId, 'Message to be read', false]
            );
            messageId = result.insertId;
        });

        it('should mark message as read successfully', async () => {
            const response = await request(app)
                .post(`/api/messages/${groupId}/${messageId}/read`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Message marked as read');

            // Verify read status in database
            const [statuses] = await pool.execute(
                'SELECT * FROM message_status WHERE message_id = ? AND user_id = ?',
                [messageId, userId]
            );
            expect(statuses.length).toBe(1);
            expect(statuses[0].status).toBe('read');
        });

        it('should fail for non-member', async () => {
            // Create another user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['otheruser', 'other@example.com', hashedPassword, 'Other User']
            );

            // Login as other user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'otheruser',
                    password: 'TestPassword123!'
                });

            const otherToken = loginResponse.body.token;

            const response = await request(app)
                .post(`/api/messages/${groupId}/${messageId}/read`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied: Not a member of this group');
            expect(response.body).toHaveProperty('code', 'NOT_MEMBER');
        });
    });
});
