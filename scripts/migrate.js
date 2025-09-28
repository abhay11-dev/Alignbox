#!/usr/bin/env node

/**
 * Database Migration Script
 * Handles database schema migrations and updates
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chat_app'
};

async function runMigrations() {
    let connection;
    
    try {
        console.log('🔄 Starting database migrations...');
        
        connection = await mysql.createConnection(dbConfig);
        
        // Create migrations table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Get executed migrations
        const [executedMigrations] = await connection.execute(
            'SELECT name FROM migrations ORDER BY executed_at'
        );
        const executedNames = executedMigrations.map(m => m.name);
        
        // Define migrations
        const migrations = [
            {
                name: '001_create_file_uploads_table',
                up: `
                    CREATE TABLE IF NOT EXISTS file_uploads (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        original_name VARCHAR(255) NOT NULL,
                        filename VARCHAR(255) NOT NULL,
                        mimetype VARCHAR(100) NOT NULL,
                        size INT NOT NULL,
                        path VARCHAR(500) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_user_id (user_id),
                        INDEX idx_created_at (created_at)
                    )
                `
            },
            {
                name: '002_add_message_indexes',
                up: `
                    CREATE INDEX IF NOT EXISTS idx_messages_group_created 
                    ON messages(group_id, created_at);
                    
                    CREATE INDEX IF NOT EXISTS idx_messages_user_created 
                    ON messages(user_id, created_at);
                `
            },
            {
                name: '003_add_user_activity_tracking',
                up: `
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS message_count INT DEFAULT 0;
                    
                    CREATE INDEX IF NOT EXISTS idx_users_last_activity 
                    ON users(last_activity);
                `
            },
            {
                name: '004_add_group_settings',
                up: `
                    ALTER TABLE groups 
                    ADD COLUMN IF NOT EXISTS settings JSON,
                    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL;
                    
                    CREATE INDEX IF NOT EXISTS idx_groups_archived 
                    ON groups(is_archived);
                `
            },
            {
                name: '005_add_message_reactions',
                up: `
                    CREATE TABLE IF NOT EXISTS message_reactions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        message_id INT NOT NULL,
                        user_id INT NOT NULL,
                        emoji VARCHAR(10) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE KEY unique_reaction (message_id, user_id, emoji),
                        INDEX idx_message_id (message_id),
                        INDEX idx_user_id (user_id)
                    )
                `
            }
        ];
        
        // Run pending migrations
        for (const migration of migrations) {
            if (!executedNames.includes(migration.name)) {
                console.log(`📝 Running migration: ${migration.name}`);
                
                try {
                    await connection.execute(migration.up);
                    await connection.execute(
                        'INSERT INTO migrations (name) VALUES (?)',
                        [migration.name]
                    );
                    console.log(`✅ Migration ${migration.name} completed`);
                } catch (error) {
                    console.error(`❌ Migration ${migration.name} failed:`, error.message);
                    throw error;
                }
            } else {
                console.log(`⏭️  Migration ${migration.name} already executed`);
            }
        }
        
        console.log('🎉 All migrations completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migrations if called directly
if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations };
