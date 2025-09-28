const request = require('supertest');
const bcrypt = require('bcrypt');
const { app } = require('../server');
const { pool } = require('../config/database');

describe('Groups Routes', () => {
    let authToken;
    let userId;
    let groupId;

    beforeEach(async () => {
        // Create a test user and get token
        const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
            ['grouptest', 'grouptest@example.com', hashedPassword, 'Group Test User']
        );
        userId = result.insertId;

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'grouptest',
                password: 'TestPassword123!'
            });

        authToken = loginResponse.body.token;
    });

    describe('POST /api/groups', () => {
        it('should create a new group successfully', async () => {
            const groupData = {
                name: 'Test Group',
                description: 'A test group for testing',
                isPrivate: false,
                maxMembers: 50
            };

            const response = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send(groupData)
                .expect(201);

            expect(response.body).toHaveProperty('name', groupData.name);
            expect(response.body).toHaveProperty('description', groupData.description);
            expect(response.body).toHaveProperty('is_private', groupData.isPrivate);
            expect(response.body).toHaveProperty('max_members', groupData.maxMembers);
            expect(response.body).toHaveProperty('created_by', userId);

            groupId = response.body.id;
        });

        it('should fail with missing group name', async () => {
            const groupData = {
                description: 'A test group without name'
            };

            const response = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send(groupData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Group name is required');
            expect(response.body).toHaveProperty('code', 'MISSING_GROUP_NAME');
        });

        it('should fail without authentication', async () => {
            const groupData = {
                name: 'Test Group',
                description: 'A test group'
            };

            await request(app)
                .post('/api/groups')
                .send(groupData)
                .expect(401);
        });
    });

    describe('GET /api/groups', () => {
        beforeEach(async () => {
            // Create a test group
            const [groupResult] = await pool.execute(
                'INSERT INTO groups (name, description, created_by, max_members) VALUES (?, ?, ?, ?)',
                ['Test Group for List', 'A group for testing list', userId, 50]
            );
            groupId = groupResult.insertId;

            // Add user as member
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, 'admin']
            );
        });

        it('should get user groups successfully', async () => {
            const response = await request(app)
                .get('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty('name', 'Test Group for List');
            expect(response.body[0]).toHaveProperty('role', 'admin');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/api/groups')
                .expect(401);
        });
    });

    describe('GET /api/groups/:groupId', () => {
        beforeEach(async () => {
            // Create a test group
            const [groupResult] = await pool.execute(
                'INSERT INTO groups (name, description, created_by, max_members) VALUES (?, ?, ?, ?)',
                ['Test Group for Details', 'A group for testing details', userId, 50]
            );
            groupId = groupResult.insertId;

            // Add user as member
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, 'admin']
            );
        });

        it('should get group details successfully', async () => {
            const response = await request(app)
                .get(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('name', 'Test Group for Details');
            expect(response.body).toHaveProperty('description', 'A group for testing details');
            expect(response.body).toHaveProperty('members');
            expect(Array.isArray(response.body.members)).toBe(true);
            expect(response.body.members.length).toBe(1);
            expect(response.body.members[0]).toHaveProperty('role', 'admin');
        });

        it('should fail for non-member', async () => {
            // Create another user
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['otheruser', 'other@example.com', hashedPassword, 'Other User']
            );
            const otherUserId = result.insertId;

            // Login as other user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'otheruser',
                    password: 'TestPassword123!'
                });

            const otherToken = loginResponse.body.token;

            const response = await request(app)
                .get(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied: Not a member of this group');
            expect(response.body).toHaveProperty('code', 'NOT_MEMBER');
        });

        it('should fail for non-existent group', async () => {
            const response = await request(app)
                .get('/api/groups/99999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Group not found');
            expect(response.body).toHaveProperty('code', 'GROUP_NOT_FOUND');
        });
    });

    describe('PUT /api/groups/:groupId', () => {
        beforeEach(async () => {
            // Create a test group
            const [groupResult] = await pool.execute(
                'INSERT INTO groups (name, description, created_by, max_members) VALUES (?, ?, ?, ?)',
                ['Test Group for Update', 'A group for testing updates', userId, 50]
            );
            groupId = groupResult.insertId;

            // Add user as admin
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, 'admin']
            );
        });

        it('should update group successfully', async () => {
            const updateData = {
                name: 'Updated Group Name',
                description: 'Updated description',
                isPrivate: true,
                maxMembers: 100
            };

            const response = await request(app)
                .put(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Group updated successfully');

            // Verify the update
            const [groups] = await pool.execute('SELECT * FROM groups WHERE id = ?', [groupId]);
            expect(groups[0].name).toBe(updateData.name);
            expect(groups[0].description).toBe(updateData.description);
            expect(groups[0].is_private).toBe(updateData.isPrivate);
            expect(groups[0].max_members).toBe(updateData.maxMembers);
        });

        it('should fail for non-admin', async () => {
            // Create another user and add as member (not admin)
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
                ['memberuser', 'member@example.com', hashedPassword, 'Member User']
            );
            const memberUserId = result.insertId;

            // Add as member
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, memberUserId, 'member']
            );

            // Login as member
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'memberuser',
                    password: 'TestPassword123!'
                });

            const memberToken = loginResponse.body.token;

            const response = await request(app)
                .put(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({ name: 'Unauthorized Update' })
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied: Admin privileges required');
            expect(response.body).toHaveProperty('code', 'NOT_ADMIN');
        });
    });

    describe('DELETE /api/groups/:groupId', () => {
        beforeEach(async () => {
            // Create a test group
            const [groupResult] = await pool.execute(
                'INSERT INTO groups (name, description, created_by, max_members) VALUES (?, ?, ?, ?)',
                ['Test Group for Delete', 'A group for testing deletion', userId, 50]
            );
            groupId = groupResult.insertId;

            // Add user as admin
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, 'admin']
            );
        });

        it('should delete group successfully', async () => {
            const response = await request(app)
                .delete(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Group deleted successfully');

            // Verify deletion
            const [groups] = await pool.execute('SELECT * FROM groups WHERE id = ?', [groupId]);
            expect(groups.length).toBe(0);
        });
    });
});
