const { error: logError } = require('../config/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

// Global error handling middleware
function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logError('Unhandled error', err, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId || null,
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new NotFoundError(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new ConflictError(message);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new ValidationError(message);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new AuthenticationError(message);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new AuthenticationError(message);
    }

    // MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
        const message = 'Duplicate entry';
        error = new ConflictError(message);
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        const message = 'Referenced resource not found';
        error = new NotFoundError(message);
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File too large';
        error = new ValidationError(message);
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const message = 'Unexpected file field';
        error = new ValidationError(message);
    }

    // Rate limit errors
    if (err.status === 429) {
        error = new RateLimitError();
    }

    // Default to 500 server error
    if (!error.statusCode) {
        error.statusCode = 500;
        error.message = 'Internal server error';
    }

    // Send error response
    const response = {
        error: error.message,
        code: error.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: error.details,
        }),
    };

    res.status(error.statusCode).json(response);
}

// 404 handler
function notFoundHandler(req, res, next) {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
}

// Async error wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Validation error handler
function handleValidationErrors(req, res, next) {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const error = new ValidationError('Validation failed', errors.array());
        return next(error);
    }
    
    next();
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    handleValidationErrors,
};

