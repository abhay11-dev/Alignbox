const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'fun-friday-chat' },
    transports: [
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Helper functions for different log levels
const logHelpers = {
    info: (message, meta = {}) => logger.info(message, meta),
    error: (message, error = null, meta = {}) => {
        if (error) {
            logger.error(message, { error: error.message, stack: error.stack, ...meta });
        } else {
            logger.error(message, meta);
        }
    },
    warn: (message, meta = {}) => logger.warn(message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),
    
    // HTTP request logging
    http: (req, res, responseTime) => {
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.userId || null,
        });
    },
    
    // Authentication logging
    auth: (action, userId, username, success, ip) => {
        logger.info(`Authentication ${action}`, {
            userId,
            username,
            success,
            ip,
            timestamp: new Date().toISOString(),
        });
    },
    
    // Database operation logging
    db: (operation, table, duration, error = null) => {
        if (error) {
            logger.error(`Database ${operation} failed`, {
                table,
                duration: `${duration}ms`,
                error: error.message,
            });
        } else {
            logger.debug(`Database ${operation}`, {
                table,
                duration: `${duration}ms`,
            });
        }
    },
    
    // Socket connection logging
    socket: (action, userId, username, socketId) => {
        logger.info(`Socket ${action}`, {
            userId,
            username,
            socketId,
            timestamp: new Date().toISOString(),
        });
    },
};

module.exports = {
    logger,
    ...logHelpers,
};

