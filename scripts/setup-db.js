// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'chat_app'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key';

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Database initialization
async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create database if not exists
        await connection.execute(`CREATE DATABASE IF NOT EXISTS chat_app`);
        await connection.execute(`USE chat_app`);
        
        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                avatar_url VARCHAR(255),
                is_online BOOLEAN DEFAULT FALSE,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create groups table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                avatar_url VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // Create group_members table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS group_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT,
                user_id INT,
                role ENUM('admin', 'member') DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_membership (group_id, user_id)
            )
        `);

        // Create messages table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT,
                user_id INT,
                content TEXT NOT NULL,
                message_type ENUM('text', 'image', 'file') DEFAULT 'text',
                file_url VARCHAR(255),
                is_anonymous BOOLEAN DEFAULT FALSE,
                reply_to INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
            )
        `);

        // Create message_status table (for read receipts)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS message_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT,
                user_id INT,
                status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_status (message_id, user_id)
            )
        `);

        // Insert demo data
        await insertDemoData(connection);
        
        connection.release();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

async function insertDemoData(connection) {
    try {
        // Check if demo data already exists
        const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
        if (existingUsers[0].count > 0) {
            return; // Demo data already exists
        }

        // Insert demo users
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        await connection.execute(`
            INSERT INTO users (username, email, password_hash, display_name) VALUES
            ('john_doe', 'john@example.com', ?, 'John Doe'),
            ('abhay_shukla', 'abhay@example.com', ?, 'Abhay Shukla'),
            ('anonymous1', 'anon1@example.com', ?, 'Anonymous User 1'),
            ('anonymous2', 'anon2@example.com', ?, 'Anonymous User 2')
        `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword]);

        // Insert demo group
        await connection.execute(`
            INSERT INTO groups (name, description, created_by) VALUES
            ('Fun Friday Group', 'Weekly fun activities and events', 1)
        `);

        // Add members to group
        await connection.execute(`
            INSERT INTO group_members (group_id, user_id, role) VALUES
            (1, 1, 'admin'),
            (1, 2, 'member'),
            (1, 3, 'member'),
            (1, 4, 'member')
        `);

        // Insert demo messages
        await connection.execute(`
            INSERT INTO messages (group_id, user_id, content, is_anonymous, created_at) VALUES
            (1, 3, 'Someone order Bornvital!', TRUE, '2024-01-01 11:35:00'),
            (1, 3, 'hahahahah!!', TRUE, '2024-01-01 11:38:00'),
            (1, 4, 'I''m Excited For this Event! Ho-Ho', TRUE, '2024-01-01 11:56:00'),
            (1, 1, 'Hi Guysss 👋', FALSE, '2024-01-01 12:31:00'),
            (1, 3, 'Hello!', TRUE, '2024-01-01 12:35:00'),
            (1, 4, 'Yessss!!!!!!!', TRUE, '2024-01-01 12:42:00'),
            (1, 1, 'Maybe I am not attending this event!', FALSE, '2024-01-01 13:36:00'),
            (1, 2, 'We have Surprise For you!!', FALSE, '2024-01-01 11:35:00')
        `);

        console.log('Demo data inserted successfully');
    } catch (error) {
        console.error('Error inserting demo data:', error);
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Socket authentication middleware
function authenticateSocket(socket, next) {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.user = user;
        next();
    });
}

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, displayName || username]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.insertId, username, email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Username or email already exists' });
        } else {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update online status
        await pool.execute(
            'UPDATE users SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user groups
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const [groups] = await pool.execute(`
            SELECT g.*, gm.role, gm.joined_at
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = ?
            ORDER BY g.updated_at DESC
        `, [req.user.userId]);

        res.json(groups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get group messages
app.get('/api/groups/:groupId/messages', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Check if user is member of the group
        const [membership] = await pool.execute(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, req.user.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get messages
        const [messages] = await pool.execute(`
            SELECT m.*, u.username, u.display_name, u.avatar_url
            FROM messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.group_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [groupId, parseInt(limit), parseInt(offset)]);

        res.json(messages.reverse());
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send message
app.post('/api/groups/:groupId/messages', authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content, isAnonymous = false, replyTo = null } = req.body;

        // Check if user is member of the group
        const [membership] = await pool.execute(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, req.user.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Insert message
        const [result] = await pool.execute(
            'INSERT INTO messages (group_id, user_id, content, is_anonymous, reply_to) VALUES (?, ?, ?, ?, ?)',
            [groupId, req.user.userId, content, isAnonymous, replyTo]
        );

        // Get the created message with user info
        const [messages] = await pool.execute(`
            SELECT m.*, u.username, u.display_name, u.avatar_url
            FROM messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        const message = messages[0];

        // Emit message to all group members
        io.to(`group_${groupId}`).emit('new_message', message);

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upload file
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.json({
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: `/uploads/${req.file.filename}`
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected`);

    // Update user online status
    updateUserOnlineStatus(socket.user.userId, true);

    // Join user to their groups
    joinUserGroups(socket);

    // Handle typing events
    socket.on('typing_start', (data) => {
        socket.to(`group_${data.groupId}`).emit('user_typing', {
            userId: socket.user.userId,
            username: socket.user.username,
            groupId: data.groupId
        });
    });

    socket.on('typing_stop', (data) => {
        socket.to(`group_${data.groupId}`).emit('user_stop_typing', {
            userId: socket.user.userId,
            groupId: data.groupId
        });
    });

    // Handle message read status
    socket.on('message_read', async (data) => {
        try {
            await pool.execute(
                'INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, timestamp = CURRENT_TIMESTAMP',
                [data.messageId, socket.user.userId, 'read', 'read']
            );

            socket.to(`group_${data.groupId}`).emit('message_status_update', {
                messageId: data.messageId,
                userId: socket.user.userId,
                status: 'read'
            });
        } catch (error) {
            console.error('Message read status error:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User ${socket.user.username} disconnected`);
        updateUserOnlineStatus(socket.user.userId, false);
    });
});

async function joinUserGroups(socket) {
    try {
        const [groups] = await pool.execute(
            'SELECT group_id FROM group_members WHERE user_id = ?',
            [socket.user.userId]
        );

        groups.forEach(group => {
            socket.join(`group_${group.group_id}`);
        });
    } catch (error) {
        console.error('Join user groups error:', error);
    }
}

async function updateUserOnlineStatus(userId, isOnline) {
    try {
        await pool.execute(
            'UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            [isOnline, userId]
        );
    } catch (error) {
        console.error('Update online status error:', error);
    }
}

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
    await initDatabase();
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Frontend available at http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);

module.exports = { app, server, io };