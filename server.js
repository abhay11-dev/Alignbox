// server.js - Industry-ready Fun Friday Chat Application
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Import custom modules
const { pool, testConnection, closePool } = require('./config/database');
const securityConfig = require('./config/security');
const { logger, http: logHttp, error: logError, info: logInfo } = require('./config/logger');
const { 
    authenticateToken, 
    authenticateSocket, 
    generateToken 
} = require('./middleware/auth');
const { 
    errorHandler, 
    notFoundHandler, 
    asyncHandler 
} = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');

// Import socket handlers
const socketHandlers = require('./socket/handlers');

// Create Express app
const app = express();
const server = http.createServer(app);

// CORS configuration: allow comma-separated origins via CORS_ORIGIN env var
const rawOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const allowAll = rawOrigins.length === 0 || rawOrigins.includes('*');
function corsOriginChecker(origin, callback) {
    // If no origin (e.g. curl, server-to-server), allow it
    if (!origin) return callback(null, true);
    if (allowAll) return callback(null, true);
    // Allow common local development origins when running in development
    if (process.env.NODE_ENV === 'development') {
        try {
            const devLocalRe = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;
            if (devLocalRe.test(origin)) return callback(null, true);
        } catch (e) {
            // ignore and continue to strict check below
        }
    }
    if (rawOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
}

// Socket.IO configuration
// Socket.IO configuration
const io = socketIo(server, {
    cors: {
        origin: corsOriginChecker,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Make io available to routes - ADD THIS LINE
app.set('io', io);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(securityConfig.helmet);
app.use(compression());
app.use(cors({
    origin: corsOriginChecker,
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use(securityConfig.rateLimit.general);

// Static file serving
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/upload', authenticateToken, securityConfig.rateLimit.upload, uploadRoutes);

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Socket.IO authentication and connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
    logInfo(`User ${socket.user.username} connected`, {
        userId: socket.user.userId,
        socketId: socket.id,
        ip: socket.handshake.address
    });

    // Initialize socket handlers
    socketHandlers(io, socket);
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
    logInfo(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
        logInfo('HTTP server closed');
        
        // Close database connections
        await closePool();
        
        // Close socket connections
        io.close(() => {
            logInfo('Socket.IO server closed');
            process.exit(0);
        });
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        logError('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
}

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in production
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logError('Uncaught Exception:', error);
    process.exit(1);
});

// Start server
async function startServer() {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Initialize database tables
        await initializeDatabase();

        const PORT = process.env.PORT || 3000;
        const HOST = process.env.HOST || '0.0.0.0';

        server.listen(PORT, HOST, () => {
            logInfo(`🚀 Server running on http://${HOST}:${PORT}`);
            logInfo(`📱 Frontend available at http://${HOST}:${PORT}`);
            logInfo(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
            logInfo(`📊 Health check: http://${HOST}:${PORT}/health`);
        });

    } catch (error) {
        logError('Failed to start server:', error);
        process.exit(1);
    }
}

// Database initialization
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create database if not exists
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'chat_app'}\``);
await connection.query(`USE \`${process.env.DB_NAME || 'chat_app'}\``);

        // Create tables
        await createTables(connection);
        
        // Insert demo data if needed
        await insertDemoData(connection);
        
        connection.release();
        logInfo('✅ Database initialized successfully');
    } catch (error) {
        logError('Database initialization error:', error);
        throw error;
    }
}

// Create database tables
async function createTables(connection) {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                avatar_url VARCHAR(255),
                is_online BOOLEAN DEFAULT FALSE,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_email (email),
                INDEX idx_online (is_online)
        ) ENGINE=InnoDB`,

        // Groups table
        `CREATE TABLE IF NOT EXISTS groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                avatar_url VARCHAR(255),
                is_private BOOLEAN DEFAULT FALSE,
                max_members INT DEFAULT 50,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id),
                INDEX idx_name (name),
                INDEX idx_created_by (created_by)
        ) ENGINE=InnoDB`,

        // Group members table
        `CREATE TABLE IF NOT EXISTS group_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT,
                user_id INT,
                role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
                can_send_messages BOOLEAN DEFAULT TRUE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_membership (group_id, user_id),
                INDEX idx_group_id (group_id),
                INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB`,

        // Messages table
        `CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT,
                user_id INT,
                content TEXT NOT NULL,
                message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
                file_url VARCHAR(255),
                file_name VARCHAR(255),
                file_size INT,
                is_anonymous BOOLEAN DEFAULT FALSE,
                reply_to INT,
                is_edited BOOLEAN DEFAULT FALSE,
                is_deleted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL,
                INDEX idx_group_id (group_id),
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at),
                INDEX idx_reply_to (reply_to)
        ) ENGINE=InnoDB`,

        // Message status table (for read receipts)
        `CREATE TABLE IF NOT EXISTS message_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT,
                user_id INT,
                status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_status (message_id, user_id),
                INDEX idx_message_id (message_id),
                INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB`,

        // User sessions table (for active sessions)
        `CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                socket_id VARCHAR(100),
                device_info TEXT,
                ip_address VARCHAR(45),
                connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_socket_id (socket_id)
        ) ENGINE=InnoDB`
    ];

    for (const table of tables) {
        await connection.execute(table);
    }
}

// Insert demo data
async function insertDemoData(connection) {
    try {
        // Check if demo data already exists
        const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
        if (existingUsers[0].count > 0) {
            logInfo('Demo data already exists, skipping...');
            return;
        }

        logInfo('Inserting demo data...');

        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        // Insert demo users
        await connection.execute(`
            INSERT INTO users (username, email, password_hash, display_name, is_online) VALUES
            ('john_doe', 'john@example.com', ?, 'John Doe', TRUE),
            ('abhay_shukla', 'abhay@example.com', ?, 'Abhay Shukla', FALSE),
            ('anonymous1', 'anon1@example.com', ?, 'Anonymous User 1', TRUE),
            ('anonymous2', 'anon2@example.com', ?, 'Anonymous User 2', FALSE),
            ('alice_wonder', 'alice@example.com', ?, 'Alice Wonder', TRUE),
            ('bob_builder', 'bob@example.com', ?, 'Bob Builder', FALSE)
        `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword, hashedPassword, hashedPassword]);

        // Insert demo groups
        await connection.execute(`
            INSERT INTO groups (name, description, created_by, max_members) VALUES
            ('Fun Friday Group', 'Weekly fun activities and events for the team', 1, 20),
            ('Tech Talk', 'Discussions about latest technology trends', 2, 50),
            ('Random Chat', 'General discussions and random topics', 1, 100)
        `);

        // Add members to groups
        await connection.execute(`
            INSERT INTO group_members (group_id, user_id, role) VALUES
            (1, 1, 'admin'),
            (1, 2, 'member'),
            (1, 3, 'member'),
            (1, 4, 'member'),
            (1, 5, 'member'),
            (2, 1, 'member'),
            (2, 2, 'admin'),
            (2, 5, 'member'),
            (2, 6, 'member'),
            (3, 1, 'admin'),
            (3, 3, 'member'),
            (3, 4, 'member'),
            (3, 6, 'member')
        `);

        // Insert demo messages with realistic timestamps
        const now = new Date();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

        await connection.execute(`
            INSERT INTO messages (group_id, user_id, content, is_anonymous, created_at) VALUES
            (1, 3, 'Someone order Bornvital!', TRUE, ?),
            (1, 4, 'hahahahah!!', TRUE, ?),
            (1, 4, 'I''m Excited For this Event! Ho-Ho', TRUE, ?),
            (1, 1, 'Hi Guysss 👋', FALSE, ?),
            (1, 3, 'Hello!', TRUE, ?),
            (1, 4, 'Yessss!!!!!!!', TRUE, ?),
            (1, 1, 'Maybe I am not attending this event!', FALSE, ?),
            (1, 2, 'We have Surprise For you!!', FALSE, ?),
            (1, 5, 'Count me in! This sounds amazing! 🎉', FALSE, ?),
            (1, 3, 'What time should we meet?', TRUE, ?),
            (2, 2, 'Welcome to Tech Talk! Let''s discuss the latest in AI', FALSE, ?),
            (2, 1, 'Has anyone tried the new React 18 features?', FALSE, ?),
            (2, 5, 'Yes! The concurrent features are game-changing', FALSE, ?),
            (3, 1, 'Good morning everyone! ☀️', FALSE, ?),
            (3, 6, 'Morning! Ready for another great day', FALSE, ?)
        `, [
            threeDaysAgo, threeDaysAgo, threeDaysAgo, twoHoursAgo, 
            twoHoursAgo, oneHourAgo, oneHourAgo, threeDaysAgo,
            oneHourAgo, now, threeDaysAgo, twoHoursAgo, 
            twoHoursAgo, now, now
        ]);

        logInfo('✅ Demo data inserted successfully');
        logInfo('Demo credentials:');
        logInfo('Username: john_doe | Password: password123');
        logInfo('Username: abhay_shukla | Password: password123');
        logInfo('Username: anonymous1 | Password: password123');
        logInfo('Username: anonymous2 | Password: password123');

    } catch (error) {
        logError('Error inserting demo data:', error);
        throw error;
    }
}

// Start the server
startServer().catch((error) => {
    logError('Failed to start server:', error);
    process.exit(1);
});

module.exports = { app, server, io };