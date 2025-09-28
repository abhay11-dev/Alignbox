const express = require('express');
const { pool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkGroupMembership, checkGroupAdmin } = require('../middleware/auth');
const { info: logInfo, error: logError } = require('../config/logger');

const router = express.Router();

// Get user's groups
router.get('/', asyncHandler(async (req, res) => {
    const [groups] = await pool.execute(`
        SELECT g.*, gm.role, gm.joined_at, 
               COUNT(gm2.user_id) as member_count,
               u.display_name as created_by_name
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN group_members gm2 ON g.id = gm2.group_id
        LEFT JOIN users u ON g.created_by = u.id
        WHERE gm.user_id = ?
        GROUP BY g.id
        ORDER BY g.updated_at DESC
    `, [req.user.userId]);

    res.json(groups);
}));

// Get group details
router.get('/:groupId', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    const [groups] = await pool.execute(`
        SELECT g.*, u.display_name as created_by_name,
               COUNT(gm.user_id) as member_count
        FROM groups g
        LEFT JOIN users u ON g.created_by = u.id
        LEFT JOIN group_members gm ON g.id = gm.group_id
        WHERE g.id = ?
        GROUP BY g.id
    `, [groupId]);

    if (groups.length === 0) {
        return res.status(404).json({ 
            error: 'Group not found',
            code: 'GROUP_NOT_FOUND'
        });
    }

    // Get group members
    const [members] = await pool.execute(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_online,
               gm.role, gm.joined_at, gm.can_send_messages
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.role DESC, gm.joined_at ASC
    `, [groupId]);

    res.json({
        ...groups[0],
        members
    });
}));

// Create new group
router.post('/', asyncHandler(async (req, res) => {
    const { name, description, isPrivate = false, maxMembers = 50 } = req.body;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({
            error: 'Group name is required',
            code: 'MISSING_GROUP_NAME'
        });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // Create group
        const [groupResult] = await connection.execute(
            'INSERT INTO groups (name, description, is_private, max_members, created_by) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), description?.trim() || null, isPrivate, maxMembers, req.user.userId]
        );

        const groupId = groupResult.insertId;

        // Add creator as admin
        await connection.execute(
            'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
            [groupId, req.user.userId, 'admin']
        );

        await connection.commit();

        // Get the created group
        const [groups] = await connection.execute(`
            SELECT g.*, u.display_name as created_by_name
            FROM groups g
            LEFT JOIN users u ON g.created_by = u.id
            WHERE g.id = ?
        `, [groupId]);

        logInfo(`Group created: ${name}`, {
            groupId,
            createdBy: req.user.userId,
            username: req.user.username
        });

        res.status(201).json(groups[0]);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}));

// Update group
router.put('/:groupId', checkGroupMembership, checkGroupAdmin, asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { name, description, isPrivate, maxMembers } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name.trim());
    }
    if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description?.trim() || null);
    }
    if (isPrivate !== undefined) {
        updateFields.push('is_private = ?');
        updateValues.push(isPrivate);
    }
    if (maxMembers !== undefined) {
        updateFields.push('max_members = ?');
        updateValues.push(maxMembers);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({
            error: 'No fields to update',
            code: 'NO_UPDATE_FIELDS'
        });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(groupId);

    await pool.execute(
        `UPDATE groups SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
    );

    logInfo(`Group updated: ${groupId}`, {
        groupId,
        updatedBy: req.user.userId,
        username: req.user.username,
        fields: updateFields
    });

    res.json({ message: 'Group updated successfully' });
}));

// Delete group
router.delete('/:groupId', checkGroupMembership, checkGroupAdmin, asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    await pool.execute('DELETE FROM groups WHERE id = ?', [groupId]);

    logInfo(`Group deleted: ${groupId}`, {
        groupId,
        deletedBy: req.user.userId,
        username: req.user.username
    });

    res.json({ message: 'Group deleted successfully' });
}));

// Add member to group
router.post('/:groupId/members', checkGroupMembership, checkGroupAdmin, asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
        return res.status(400).json({
            error: 'User ID is required',
            code: 'MISSING_USER_ID'
        });
    }

    // Check if user exists
    const [users] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
        return res.status(404).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    // Check if user is already a member
    const [existingMembership] = await pool.execute(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
    );

    if (existingMembership.length > 0) {
        return res.status(409).json({
            error: 'User is already a member of this group',
            code: 'USER_ALREADY_MEMBER'
        });
    }

    // Check group capacity
    const [groupInfo] = await pool.execute(
        'SELECT max_members FROM groups WHERE id = ?',
        [groupId]
    );

    const [memberCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
        [groupId]
    );

    if (memberCount[0].count >= groupInfo[0].max_members) {
        return res.status(400).json({
            error: 'Group has reached maximum member capacity',
            code: 'GROUP_FULL'
        });
    }

    // Add member
    await pool.execute(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, userId, role]
    );

    logInfo(`Member added to group: ${groupId}`, {
        groupId,
        userId,
        role,
        addedBy: req.user.userId,
        username: req.user.username
    });

    res.status(201).json({ message: 'Member added successfully' });
}));

// Remove member from group
router.delete('/:groupId/members/:userId', checkGroupMembership, checkGroupAdmin, asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;

    // Don't allow removing the group creator
    const [groupInfo] = await pool.execute('SELECT created_by FROM groups WHERE id = ?', [groupId]);
    if (groupInfo[0].created_by == userId) {
        return res.status(400).json({
            error: 'Cannot remove group creator',
            code: 'CANNOT_REMOVE_CREATOR'
        });
    }

    await pool.execute(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
    );

    logInfo(`Member removed from group: ${groupId}`, {
        groupId,
        userId,
        removedBy: req.user.userId,
        username: req.user.username
    });

    res.json({ message: 'Member removed successfully' });
}));

// Update member role
router.put('/:groupId/members/:userId', checkGroupMembership, checkGroupAdmin, asyncHandler(async (req, res) => {
    const { groupId, userId } = req.params;
    const { role, canSendMessages } = req.body;

    if (!role && canSendMessages === undefined) {
        return res.status(400).json({
            error: 'No fields to update',
            code: 'NO_UPDATE_FIELDS'
        });
    }

    const updateFields = [];
    const updateValues = [];

    if (role) {
        updateFields.push('role = ?');
        updateValues.push(role);
    }
    if (canSendMessages !== undefined) {
        updateFields.push('can_send_messages = ?');
        updateValues.push(canSendMessages);
    }

    updateValues.push(groupId, userId);

    await pool.execute(
        `UPDATE group_members SET ${updateFields.join(', ')} WHERE group_id = ? AND user_id = ?`,
        updateValues
    );

    logInfo(`Member role updated in group: ${groupId}`, {
        groupId,
        userId,
        role,
        canSendMessages,
        updatedBy: req.user.userId,
        username: req.user.username
    });

    res.json({ message: 'Member role updated successfully' });
}));

// Leave group
router.post('/:groupId/leave', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId } = req.params;

    // Don't allow group creator to leave
    const [groupInfo] = await pool.execute('SELECT created_by FROM groups WHERE id = ?', [groupId]);
    if (groupInfo[0].created_by == req.user.userId) {
        return res.status(400).json({
            error: 'Group creator cannot leave the group',
            code: 'CREATOR_CANNOT_LEAVE'
        });
    }

    await pool.execute(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, req.user.userId]
    );

    logInfo(`User left group: ${groupId}`, {
        groupId,
        userId: req.user.userId,
        username: req.user.username
    });

    res.json({ message: 'Left group successfully' });
}));

module.exports = router;

