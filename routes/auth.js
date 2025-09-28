const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const { pool } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { auth: logAuth, error: logError } = require('../config/logger');
const securityConfig = require('../config/security');

const router = express.Router();

// Apply rate limiting to auth routes
router.use(securityConfig.rateLimit.auth);

// User registration
router.post('/register', 
    securityConfig.validation.register,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { username, email, password, displayName } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        // Insert user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, displayName || username]
        );

        // Generate JWT token
        const token = generateToken({
            userId: result.insertId,
            username,
            email
        });

        logAuth('register', result.insertId, username, true, req.ip);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: result.insertId,
                username,
                email,
                displayName: displayName || username
            }
        });
    })
);

// User login
router.post('/login',
    securityConfig.validation.login,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { username, password } = req.body;
        
        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            logAuth('login', null, username, false, req.ip);
            return res.status(401).json({ 
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = users[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            logAuth('login', user.id, username, false, req.ip);
            return res.status(401).json({ 
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update online status
        await pool.execute(
            'UPDATE users SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            username: user.username,
            email: user.email
        });

        logAuth('login', user.id, user.username, true, req.ip);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url
            }
        });
    })
);

// Logout (client-side token removal, server-side status update)
router.post('/logout', asyncHandler(async (req, res) => {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({ message: 'Logout successful' });
}));

// Get current user profile
router.get('/me', asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'NO_TOKEN'
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        
        const [users] = await pool.execute(
            'SELECT id, username, email, display_name, avatar_url, is_online, last_seen, created_at FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({ user: users[0] });
    } catch (error) {
        res.status(401).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
}));

module.exports = router;
