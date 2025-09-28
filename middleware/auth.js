const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { error: logError, auth: logAuth } = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

// HTTP Authentication middleware
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            logAuth('attempt', null, null, false, req.ip);
            return res.status(401).json({ 
                error: 'Access token required',
                code: 'NO_TOKEN'
            });
        }

        const decoded = verifyToken(token);
        
        // Verify user still exists and is active
        const [users] = await pool.execute(
            'SELECT id, username, email, display_name, avatar_url, is_online FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            logAuth('attempt', decoded.userId, decoded.username, false, req.ip);
            return res.status(403).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        req.user = {
            ...decoded,
            ...users[0]
        };

        next();
    } catch (error) {
        logError('Authentication error', error, { ip: req.ip });
        return res.status(403).json({ 
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
}

// Socket Authentication middleware
function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = verifyToken(token);
        socket.user = decoded;
        next();
    } catch (error) {
        logError('Socket authentication error', error);
        next(new Error('Authentication error: Invalid token'));
    }
}

// Optional authentication middleware (doesn't fail if no token)
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyToken(token);
            const [users] = await pool.execute(
                'SELECT id, username, email, display_name, avatar_url FROM users WHERE id = ?',
                [decoded.userId]
            );

            if (users.length > 0) {
                req.user = {
                    ...decoded,
                    ...users[0]
                };
            }
        }

        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
}

// Check if user is member of group
async function checkGroupMembership(req, res, next) {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        const [membership] = await pool.execute(
            'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ 
                error: 'Access denied: Not a member of this group',
                code: 'NOT_MEMBER'
            });
        }

        req.user.groupRole = membership[0].role;
        next();
    } catch (error) {
        logError('Group membership check error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Check if user is admin of group
async function checkGroupAdmin(req, res, next) {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        const [membership] = await pool.execute(
            'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role = "admin"',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ 
                error: 'Access denied: Admin privileges required',
                code: 'NOT_ADMIN'
            });
        }

        next();
    } catch (error) {
        logError('Group admin check error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    authenticateSocket,
    optionalAuth,
    checkGroupMembership,
    checkGroupAdmin,
};

