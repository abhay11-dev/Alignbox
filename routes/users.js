const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { info: logInfo, error: logError } = require('../config/logger');
const securityConfig = require('../config/security');

const router = express.Router();

// Get user profile
router.get('/profile', asyncHandler(async (req, res) => {
    const [users] = await pool.execute(
        'SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at FROM users WHERE id = ?',
        [req.user.userId]
    );

    if (users.length === 0) {
        return res.status(404).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    res.json({ user: users[0] });
}));

// Update user profile
router.put('/profile', 
    [
        body('displayName')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('Display name must be between 1 and 100 characters')
            .trim()
            .escape(),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail()
    ],
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { displayName, email } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (displayName !== undefined) {
            updateFields.push('display_name = ?');
            updateValues.push(displayName.trim());
        }

        if (email !== undefined) {
            // Check if email is already taken by another user
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.userId]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    error: 'Email is already taken',
                    code: 'EMAIL_TAKEN'
                });
            }

            updateFields.push('email = ?');
            updateValues.push(email);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(req.user.userId);

        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        logInfo(`User profile updated: ${req.user.userId}`, {
            userId: req.user.userId,
            username: req.user.username,
            fields: updateFields
        });

        res.json({ message: 'Profile updated successfully' });
    })
);

// Change password
router.put('/password',
    [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    ],
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        // Get current user with password hash
        const [users] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, req.user.userId]
        );

        logInfo(`Password changed: ${req.user.userId}`, {
            userId: req.user.userId,
            username: req.user.username
        });

        res.json({ message: 'Password changed successfully' });
    })
);

// Upload avatar
router.post('/avatar', asyncHandler(async (req, res) => {
    // This would typically handle file upload
    // For now, we'll just return a placeholder
    res.json({ message: 'Avatar upload endpoint - implementation needed' });
}));

// Get user's groups
router.get('/groups', asyncHandler(async (req, res) => {
    const [groups] = await pool.execute(`
        SELECT g.*, gm.role, gm.joined_at,
               COUNT(gm2.user_id) as member_count
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN group_members gm2 ON g.id = gm2.group_id
        WHERE gm.user_id = ?
        GROUP BY g.id
        ORDER BY g.updated_at DESC
    `, [req.user.userId]);

    res.json(groups);
}));

// Get user's online status
router.get('/status', asyncHandler(async (req, res) => {
    const [users] = await pool.execute(
        'SELECT is_online, last_seen FROM users WHERE id = ?',
        [req.user.userId]
    );

    if (users.length === 0) {
        return res.status(404).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    res.json({
        isOnline: users[0].is_online,
        lastSeen: users[0].last_seen
    });
}));

// Update online status
router.put('/status', asyncHandler(async (req, res) => {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
        return res.status(400).json({
            error: 'isOnline must be a boolean value',
            code: 'INVALID_STATUS'
        });
    }

    await pool.execute(
        'UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        [isOnline, req.user.userId]
    );

    logInfo(`User status updated: ${req.user.userId}`, {
        userId: req.user.userId,
        username: req.user.username,
        isOnline
    });

    res.json({ message: 'Status updated successfully' });
}));

// Search users
router.get('/search', asyncHandler(async (req, res) => {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            error: 'Search query must be at least 2 characters long',
            code: 'INVALID_SEARCH_QUERY'
        });
    }

    const searchTerm = `%${q.trim()}%`;
    const [users] = await pool.execute(`
        SELECT id, username, display_name, avatar_url, is_online
        FROM users
        WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
        ORDER BY is_online DESC, username ASC
        LIMIT ?
    `, [searchTerm, searchTerm, req.user.userId, parseInt(limit)]);

    res.json(users);
}));

// Get user by ID (public info only)
router.get('/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const [users] = await pool.execute(`
        SELECT id, username, display_name, avatar_url, is_online, last_seen
        FROM users
        WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
        return res.status(404).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    res.json({ user: users[0] });
}));

module.exports = router;

