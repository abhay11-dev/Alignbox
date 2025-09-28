const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { info: logInfo, error: logError } = require('../config/logger');
const securityConfig = require('../config/security');

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_PATH || 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: securityConfig.fileUpload.maxFileSize,
        files: securityConfig.fileUpload.maxFiles
    },
    fileFilter: (req, file, cb) => {
        if (securityConfig.fileUpload.allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Upload single file
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        // Store file metadata in database
        const [result] = await pool.execute(
            'INSERT INTO file_uploads (user_id, original_name, filename, mimetype, size, path) VALUES (?, ?, ?, ?, ?, ?)',
            [
                req.user.userId,
                req.file.originalname,
                req.file.filename,
                req.file.mimetype,
                req.file.size,
                req.file.path
            ]
        );

        const fileData = {
            id: result.insertId,
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: `/uploads/${req.file.filename}`,
            uploadedAt: new Date().toISOString()
        };

        logInfo(`File uploaded: ${req.file.originalname}`, {
            fileId: result.insertId,
            userId: req.user.userId,
            username: req.user.username,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        res.json({
            message: 'File uploaded successfully',
            file: fileData
        });
    } catch (error) {
        // Clean up uploaded file if database insert fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        throw error;
    }
}));

// Upload multiple files
router.post('/multiple', upload.array('files', 5), asyncHandler(async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No files uploaded',
                code: 'NO_FILES'
            });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            // Store file metadata in database
            const [result] = await pool.execute(
                'INSERT INTO file_uploads (user_id, original_name, filename, mimetype, size, path) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    req.user.userId,
                    file.originalname,
                    file.filename,
                    file.mimetype,
                    file.size,
                    file.path
                ]
            );

            uploadedFiles.push({
                id: result.insertId,
                originalName: file.originalname,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size,
                url: `/uploads/${file.filename}`,
                uploadedAt: new Date().toISOString()
            });
        }

        logInfo(`Multiple files uploaded: ${req.files.length} files`, {
            userId: req.user.userId,
            username: req.user.username,
            fileCount: req.files.length
        });

        res.json({
            message: 'Files uploaded successfully',
            files: uploadedFiles
        });
    } catch (error) {
        // Clean up uploaded files if database insert fails
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        throw error;
    }
}));

// Get user's uploaded files
router.get('/', asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0 } = req.query;

    const [files] = await pool.execute(`
        SELECT id, original_name, filename, mimetype, size, path, created_at
        FROM file_uploads
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `, [req.user.userId, parseInt(limit), parseInt(offset)]);

    const filesWithUrls = files.map(file => ({
        ...file,
        url: `/uploads/${file.filename}`
    }));

    res.json(filesWithUrls);
}));

// Delete uploaded file
router.delete('/:fileId', asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    // Get file info
    const [files] = await pool.execute(
        'SELECT * FROM file_uploads WHERE id = ? AND user_id = ?',
        [fileId, req.user.userId]
    );

    if (files.length === 0) {
        return res.status(404).json({
            error: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    const file = files[0];

    // Delete file from filesystem
    if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }

    // Delete file record from database
    await pool.execute('DELETE FROM file_uploads WHERE id = ?', [fileId]);

    logInfo(`File deleted: ${file.original_name}`, {
        fileId,
        userId: req.user.userId,
        username: req.user.username,
        filename: file.filename
    });

    res.json({ message: 'File deleted successfully' });
}));

// Get file info
router.get('/:fileId', asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    const [files] = await pool.execute(
        'SELECT * FROM file_uploads WHERE id = ? AND user_id = ?',
        [fileId, req.user.userId]
    );

    if (files.length === 0) {
        return res.status(404).json({
            error: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    const file = files[0];
    res.json({
        ...file,
        url: `/uploads/${file.filename}`
    });
}));

// Error handling for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                code: 'FILE_TOO_LARGE',
                maxSize: securityConfig.fileUpload.maxFileSize
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                code: 'TOO_MANY_FILES',
                maxFiles: securityConfig.fileUpload.maxFiles
            });
        }
    }
    
    if (error.message === 'Invalid file type') {
        return res.status(400).json({
            error: 'Invalid file type',
            code: 'INVALID_FILE_TYPE',
            allowedTypes: securityConfig.fileUpload.allowedMimeTypes
        });
    }

    next(error);
});

module.exports = router;

