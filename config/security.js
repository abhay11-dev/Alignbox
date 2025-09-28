const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Security middleware configuration
const securityConfig = {
    // Helmet configuration for security headers
    helmet: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }),

    // Rate limiting configuration
    rateLimit: {
        general: rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.',
            },
            standardHeaders: true,
            legacyHeaders: false,
        }),

        auth: rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // limit each IP to 5 auth requests per windowMs
            message: {
                error: 'Too many authentication attempts, please try again later.',
            },
            skipSuccessfulRequests: true,
        }),

        upload: rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 10, // limit each IP to 10 uploads per minute
            message: {
                error: 'Too many file uploads, please try again later.',
            },
        }),
    },

    // Input validation rules
    validation: {
        register: [
            body('username')
                .isLength({ min: 3, max: 50 })
                .withMessage('Username must be between 3 and 50 characters')
                .matches(/^[a-zA-Z0-9_]+$/)
                .withMessage('Username can only contain letters, numbers, and underscores'),
            body('email')
                .isEmail()
                .withMessage('Please provide a valid email address')
                .normalizeEmail(),
            body('password')
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
                .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
            body('displayName')
                .optional()
                .isLength({ min: 1, max: 100 })
                .withMessage('Display name must be between 1 and 100 characters')
                .trim()
                .escape(),
        ],

        login: [
            body('username')
                .notEmpty()
                .withMessage('Username or email is required')
                .trim()
                .escape(),
            body('password')
                .notEmpty()
                .withMessage('Password is required'),
        ],

        message: [
            body('content')
                .isLength({ min: 1, max: 2000 })
                .withMessage('Message content must be between 1 and 2000 characters')
                .trim()
                .escape(),
            body('isAnonymous')
                .optional()
                .isBoolean()
                .withMessage('isAnonymous must be a boolean value'),
        ],
    },

    // Validation result handler
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }
        next();
    },

    // Sanitize user input
    sanitizeInput: (input) => {
        if (typeof input === 'string') {
            return input
                .trim()
                .replace(/[<>]/g, '') // Remove potential HTML tags
                .substring(0, 2000); // Limit length
        }
        return input;
    },

    // File upload security
    fileUpload: {
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        maxFiles: 1,
    },
};

module.exports = securityConfig;

