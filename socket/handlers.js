const { pool } = require('../config/database');
const { info: logInfo, error: logError, socket: logSocket } = require('../config/logger');

module.exports = function socketHandlers(io, socket) {
    const userId = socket.user.userId;
    const username = socket.user.username;

    // Update user online status
    updateUserOnlineStatus(userId, true);

    // Join user to their groups
    joinUserGroups(socket);

    // Store socket session
    storeSocketSession(socket);

    // Handle typing events
    socket.on('typing_start', (data) => {
        try {
            socket.to(`group_${data.groupId}`).emit('user_typing', {
                userId: socket.user.userId,
                username: socket.user.username,
                groupId: data.groupId
            });
        } catch (error) {
            logError('Typing start error', error, {
                userId,
                username,
                groupId: data.groupId
            });
        }
    });

    socket.on('typing_stop', (data) => {
        try {
            socket.to(`group_${data.groupId}`).emit('user_stop_typing', {
                userId: socket.user.userId,
                groupId: data.groupId
            });
        } catch (error) {
            logError('Typing stop error', error, {
                userId,
                username,
                groupId: data.groupId
            });
        }
    });

    // Handle message read status
    socket.on('message_read', async (data) => {
        try {
            const { messageId, groupId } = data;

            // Verify user is member of the group
            const [membership] = await pool.execute(
                'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (membership.length === 0) {
                socket.emit('error', { message: 'Not a member of this group' });
                return;
            }

            // Update message status
            await pool.execute(
                'INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, timestamp = CURRENT_TIMESTAMP',
                [messageId, userId, 'read', 'read']
            );

            // Emit to other group members
            socket.to(`group_${groupId}`).emit('message_status_update', {
                messageId,
                userId,
                status: 'read'
            });

            logInfo(`Message marked as read: ${messageId}`, {
                messageId,
                groupId,
                userId,
                username
            });
        } catch (error) {
            logError('Message read status error', error, {
                userId,
                username,
                messageId: data.messageId,
                groupId: data.groupId
            });
        }
    });

    // Handle message delivery status
    socket.on('message_delivered', async (data) => {
        try {
            const { messageId, groupId } = data;

            // Verify user is member of the group
            const [membership] = await pool.execute(
                'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (membership.length === 0) {
                return;
            }

            // Update message status
            await pool.execute(
                'INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, timestamp = CURRENT_TIMESTAMP',
                [messageId, userId, 'delivered', 'delivered']
            );

            // Emit to other group members
            socket.to(`group_${groupId}`).emit('message_status_update', {
                messageId,
                userId,
                status: 'delivered'
            });
        } catch (error) {
            logError('Message delivered status error', error, {
                userId,
                username,
                messageId: data.messageId,
                groupId: data.groupId
            });
        }
    });

    // Handle join group
    socket.on('join_group', async (data) => {
        try {
            const { groupId } = data;

            // Verify user is member of the group
            const [membership] = await pool.execute(
                'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (membership.length === 0) {
                socket.emit('error', { message: 'Not a member of this group' });
                return;
            }

            socket.join(`group_${groupId}`);
            
            // Notify other group members
            socket.to(`group_${groupId}`).emit('user_joined_group', {
                userId,
                username,
                groupId
            });

            logSocket('joined group', userId, username, socket.id, { groupId });
        } catch (error) {
            logError('Join group error', error, {
                userId,
                username,
                groupId: data.groupId
            });
        }
    });

    // Handle leave group
    socket.on('leave_group', (data) => {
        try {
            const { groupId } = data;
            socket.leave(`group_${groupId}`);
            
            // Notify other group members
            socket.to(`group_${groupId}`).emit('user_left_group', {
                userId,
                username,
                groupId
            });

            logSocket('left group', userId, username, socket.id, { groupId });
        } catch (error) {
            logError('Leave group error', error, {
                userId,
                username,
                groupId: data.groupId
            });
        }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
        socket.emit('pong');
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
        try {
            logSocket('disconnected', userId, username, socket.id, { reason });
            
            // Update user online status
            await updateUserOnlineStatus(userId, false);
            
            // Remove socket session
            await removeSocketSession(socket.id);
            
            // Notify all groups user was in
            await notifyUserDisconnection(socket);
        } catch (error) {
            logError('Disconnect handling error', error, {
                userId,
                username,
                socketId: socket.id,
                reason
            });
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        logError('Socket error', error, {
            userId,
            username,
            socketId: socket.id
        });
    });
};

// Helper functions
async function updateUserOnlineStatus(userId, isOnline) {
    try {
        await pool.execute(
            'UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            [isOnline, userId]
        );
    } catch (error) {
        logError('Update online status error', error, { userId, isOnline });
    }
}

async function joinUserGroups(socket) {
    try {
        const [groups] = await pool.execute(
            'SELECT group_id FROM group_members WHERE user_id = ?',
            [socket.user.userId]
        );

        groups.forEach(group => {
            socket.join(`group_${group.group_id}`);
        });

        logSocket('joined groups', socket.user.userId, socket.user.username, socket.id, {
            groupCount: groups.length
        });
    } catch (error) {
        logError('Join user groups error', error, {
            userId: socket.user.userId,
            username: socket.user.username
        });
    }
}

async function storeSocketSession(socket) {
    try {
        const deviceInfo = {
            userAgent: socket.handshake.headers['user-agent'],
            ip: socket.handshake.address,
            connectedAt: new Date()
        };

        await pool.execute(
            'INSERT INTO user_sessions (user_id, socket_id, device_info, ip_address) VALUES (?, ?, ?, ?)',
            [
                socket.user.userId,
                socket.id,
                JSON.stringify(deviceInfo),
                socket.handshake.address
            ]
        );
    } catch (error) {
        logError('Store socket session error', error, {
            userId: socket.user.userId,
            socketId: socket.id
        });
    }
}

async function removeSocketSession(socketId) {
    try {
        await pool.execute(
            'DELETE FROM user_sessions WHERE socket_id = ?',
            [socketId]
        );
    } catch (error) {
        logError('Remove socket session error', error, { socketId });
    }
}

async function notifyUserDisconnection(socket) {
    try {
        // Get all groups user was in
        const [groups] = await pool.execute(
            'SELECT group_id FROM group_members WHERE user_id = ?',
            [socket.user.userId]
        );

        // Notify each group
        groups.forEach(group => {
            socket.to(`group_${group.group_id}`).emit('user_disconnected', {
                userId: socket.user.userId,
                username: socket.user.username,
                groupId: group.group_id
            });
        });
    } catch (error) {
        logError('Notify user disconnection error', error, {
            userId: socket.user.userId,
            username: socket.user.username
        });
    }
}
