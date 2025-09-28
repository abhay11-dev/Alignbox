const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../config/database');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { checkGroupMembership } = require('../middleware/auth');
const { info: logInfo, error: logError } = require('../config/logger');
const securityConfig = require('../config/security');

const router = express.Router();

// Get group messages
router.get('/:groupId', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { limit = 50, offset = 0, before = null } = req.query;

    let query = `
        SELECT m.*, u.username, u.display_name, u.avatar_url,
               reply_to_msg.content as reply_content,
               reply_to_user.display_name as reply_to_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN messages reply_to_msg ON m.reply_to = reply_to_msg.id
        LEFT JOIN users reply_to_user ON reply_to_msg.user_id = reply_to_user.id
        WHERE m.group_id = ? AND m.is_deleted = FALSE
    `;
    
    const queryParams = [groupId];

    if (before) {
        query += ' AND m.created_at < ?';
        queryParams.push(before);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    const [messages] = await pool.execute(query, queryParams);

    // Get message status for each message
    for (let message of messages) {
        const [statuses] = await pool.execute(`
            SELECT user_id, status, timestamp
            FROM message_status
            WHERE message_id = ?
            ORDER BY timestamp DESC
        `, [message.id]);
        
        message.statuses = statuses;
    }

    res.json(messages.reverse());
}));

// Send message
router.post('/:groupId',
    checkGroupMembership,
    securityConfig.validation.message,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { groupId } = req.params;
        const { content, isAnonymous = false, replyTo = null, messageType = 'text' } = req.body;

        // Check if user can send messages in this group
        const [membership] = await pool.execute(
            'SELECT can_send_messages FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, req.user.userId]
        );

        if (membership.length === 0 || !membership[0].can_send_messages) {
            return res.status(403).json({
                error: 'You are not allowed to send messages in this group',
                code: 'MESSAGE_SENDING_DISABLED'
            });
        }

        // Insert message
        const [result] = await pool.execute(
            'INSERT INTO messages (group_id, user_id, content, is_anonymous, reply_to, message_type) VALUES (?, ?, ?, ?, ?, ?)',
            [groupId, req.user.userId, content, isAnonymous, replyTo, messageType]
        );

        // Get the created message with user info
        const [messages] = await pool.execute(`
            SELECT m.*, u.username, u.display_name, u.avatar_url,
                   reply_to_msg.content as reply_content,
                   reply_to_user.display_name as reply_to_name
            FROM messages m
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN messages reply_to_msg ON m.reply_to = reply_to_msg.id
            LEFT JOIN users reply_to_user ON reply_to_msg.user_id = reply_to_user.id
            WHERE m.id = ?
        `, [result.insertId]);

        const message = messages[0];

        // Emit message to all group members via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(`group_${groupId}`).emit('new_message', message);
        }

        logInfo(`Message sent in group: ${groupId}`, {
            messageId: result.insertId,
            groupId,
            userId: req.user.userId,
            username: req.user.username,
            isAnonymous,
            messageType
        });

        res.status(201).json(message);
    })
);

// Edit message
router.put('/:groupId/:messageId', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId, messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            error: 'Message content is required',
            code: 'MISSING_CONTENT'
        });
    }

    // Check if message exists and belongs to user
    const [messages] = await pool.execute(
        'SELECT id, user_id, created_at FROM messages WHERE id = ? AND group_id = ? AND is_deleted = FALSE',
        [messageId, groupId]
    );

    if (messages.length === 0) {
        return res.status(404).json({
            error: 'Message not found',
            code: 'MESSAGE_NOT_FOUND'
        });
    }

    const message = messages[0];

    // Check if user owns the message or is group admin
    const [membership] = await pool.execute(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, req.user.userId]
    );

    const isOwner = message.user_id === req.user.userId;
    const isAdmin = membership.length > 0 && membership[0].role === 'admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            error: 'You can only edit your own messages',
            code: 'NOT_MESSAGE_OWNER'
        });
    }

    // Check if message is too old to edit (24 hours)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours

    if (messageAge > maxEditAge) {
        return res.status(400).json({
            error: 'Message is too old to edit',
            code: 'MESSAGE_TOO_OLD'
        });
    }

    // Update message
    await pool.execute(
        'UPDATE messages SET content = ?, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content.trim(), messageId]
    );

    // Get updated message
    const [updatedMessages] = await pool.execute(`
        SELECT m.*, u.username, u.display_name, u.avatar_url
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
    `, [messageId]);

    // Emit update to group members
    const io = req.app.get('io');
    if (io) {
        io.to(`group_${groupId}`).emit('message_updated', updatedMessages[0]);
    }

    logInfo(`Message edited: ${messageId}`, {
        messageId,
        groupId,
        userId: req.user.userId,
        username: req.user.username,
        isAdmin
    });

    res.json(updatedMessages[0]);
}));

// Delete message
router.delete('/:groupId/:messageId', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId, messageId } = req.params;

    // Check if message exists
    const [messages] = await pool.execute(
        'SELECT id, user_id, created_at FROM messages WHERE id = ? AND group_id = ? AND is_deleted = FALSE',
        [messageId, groupId]
    );

    if (messages.length === 0) {
        return res.status(404).json({
            error: 'Message not found',
            code: 'MESSAGE_NOT_FOUND'
        });
    }

    const message = messages[0];

    // Check if user owns the message or is group admin
    const [membership] = await pool.execute(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, req.user.userId]
    );

    const isOwner = message.user_id === req.user.userId;
    const isAdmin = membership.length > 0 && membership[0].role === 'admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            error: 'You can only delete your own messages',
            code: 'NOT_MESSAGE_OWNER'
        });
    }

    // Soft delete message
    await pool.execute(
        'UPDATE messages SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [messageId]
    );

    // Emit deletion to group members
    const io = req.app.get('io');
    if (io) {
        io.to(`group_${groupId}`).emit('message_deleted', {
            messageId,
            groupId,
            deletedBy: req.user.userId
        });
    }

    logInfo(`Message deleted: ${messageId}`, {
        messageId,
        groupId,
        userId: req.user.userId,
        username: req.user.username,
        isAdmin
    });

    res.json({ message: 'Message deleted successfully' });
}));

// Mark message as read
router.post('/:groupId/:messageId/read', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId, messageId } = req.params;

    // Check if message exists
    const [messages] = await pool.execute(
        'SELECT id FROM messages WHERE id = ? AND group_id = ? AND is_deleted = FALSE',
        [messageId, groupId]
    );

    if (messages.length === 0) {
        return res.status(404).json({
            error: 'Message not found',
            code: 'MESSAGE_NOT_FOUND'
        });
    }

    // Update or insert read status
    await pool.execute(
        'INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, timestamp = CURRENT_TIMESTAMP',
        [messageId, req.user.userId, 'read', 'read']
    );

    // Emit read status to group members
    const io = req.app.get('io');
    if (io) {
        io.to(`group_${groupId}`).emit('message_status_update', {
            messageId,
            userId: req.user.userId,
            status: 'read'
        });
    }

    res.json({ message: 'Message marked as read' });
}));

// Get message status
router.get('/:groupId/:messageId/status', checkGroupMembership, asyncHandler(async (req, res) => {
    const { groupId, messageId } = req.params;

    const [statuses] = await pool.execute(`
        SELECT ms.*, u.username, u.display_name
        FROM message_status ms
        JOIN users u ON ms.user_id = u.id
        WHERE ms.message_id = ?
        ORDER BY ms.timestamp DESC
    `, [messageId]);

    res.json(statuses);
}));

module.exports = router;

