#!/usr/bin/env node

/**
 * Database Seeding Script
 * Populates the database with sample data for development and testing
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chat_app'
};

async function seedDatabase() {
    let connection;
    
    try {
        console.log('🌱 Starting database seeding...');
        
        connection = await mysql.createConnection(dbConfig);
        
        // Check if data already exists
        const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
        if (existingUsers[0].count > 0) {
            console.log('⚠️  Database already contains data. Skipping seeding.');
            return;
        }
        
        console.log('📝 Inserting sample data...');
        
        // Hash password for all users
        const hashedPassword = await bcrypt.hash('password123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        // Insert sample users
        console.log('👥 Creating sample users...');
        await connection.execute(`
            INSERT INTO users (username, email, password_hash, display_name, is_online, created_at) VALUES
            ('john_doe', 'john@example.com', ?, 'John Doe', TRUE, NOW() - INTERVAL 7 DAY),
            ('jane_smith', 'jane@example.com', ?, 'Jane Smith', TRUE, NOW() - INTERVAL 6 DAY),
            ('mike_wilson', 'mike@example.com', ?, 'Mike Wilson', FALSE, NOW() - INTERVAL 5 DAY),
            ('sarah_jones', 'sarah@example.com', ?, 'Sarah Jones', TRUE, NOW() - INTERVAL 4 DAY),
            ('alex_brown', 'alex@example.com', ?, 'Alex Brown', FALSE, NOW() - INTERVAL 3 DAY),
            ('emma_davis', 'emma@example.com', ?, 'Emma Davis', TRUE, NOW() - INTERVAL 2 DAY),
            ('chris_taylor', 'chris@example.com', ?, 'Chris Taylor', FALSE, NOW() - INTERVAL 1 DAY),
            ('lisa_anderson', 'lisa@example.com', ?, 'Lisa Anderson', TRUE, NOW() - INTERVAL 12 HOUR),
            ('david_miller', 'david@example.com', ?, 'David Miller', FALSE, NOW() - INTERVAL 6 HOUR),
            ('anna_white', 'anna@example.com', ?, 'Anna White', TRUE, NOW() - INTERVAL 1 HOUR)
        `, Array(10).fill(hashedPassword));
        
        // Insert sample groups
        console.log('🏢 Creating sample groups...');
        await connection.execute(`
            INSERT INTO groups (name, description, is_private, max_members, created_by, created_at) VALUES
            ('Fun Friday Group', 'Weekly fun activities and team building events', FALSE, 50, 1, NOW() - INTERVAL 7 DAY),
            ('Tech Talk', 'Discussions about latest technology trends and innovations', FALSE, 100, 2, NOW() - INTERVAL 6 DAY),
            ('Random Chat', 'General discussions and random topics', FALSE, 200, 3, NOW() - INTERVAL 5 DAY),
            ('Project Alpha', 'Internal project discussions and updates', TRUE, 20, 4, NOW() - INTERVAL 4 DAY),
            ('Book Club', 'Monthly book discussions and recommendations', FALSE, 30, 5, NOW() - INTERVAL 3 DAY),
            ('Fitness Group', 'Workout tips and motivation sharing', FALSE, 40, 6, NOW() - INTERVAL 2 DAY),
            ('Food Lovers', 'Recipe sharing and restaurant recommendations', FALSE, 60, 7, NOW() - INTERVAL 1 DAY),
            ('Travel Enthusiasts', 'Travel tips and destination sharing', FALSE, 80, 8, NOW() - INTERVAL 12 HOUR)
        `);
        
        // Add members to groups
        console.log('👥 Adding group memberships...');
        const groupMemberships = [
            // Fun Friday Group
            [1, 1, 'admin'], [1, 2, 'member'], [1, 3, 'member'], [1, 4, 'member'], [1, 5, 'member'],
            [1, 6, 'member'], [1, 7, 'member'], [1, 8, 'member'], [1, 9, 'member'], [1, 10, 'member'],
            
            // Tech Talk
            [2, 2, 'admin'], [2, 1, 'member'], [2, 3, 'member'], [2, 4, 'member'], [2, 5, 'member'],
            [2, 6, 'member'], [2, 7, 'member'], [2, 8, 'member'],
            
            // Random Chat
            [3, 3, 'admin'], [3, 1, 'member'], [3, 2, 'member'], [3, 4, 'member'], [3, 5, 'member'],
            [3, 6, 'member'], [3, 7, 'member'], [3, 8, 'member'], [3, 9, 'member'], [3, 10, 'member'],
            
            // Project Alpha
            [4, 4, 'admin'], [4, 1, 'member'], [4, 2, 'member'], [4, 3, 'member'], [4, 5, 'member'],
            
            // Book Club
            [5, 5, 'admin'], [5, 6, 'member'], [5, 7, 'member'], [5, 8, 'member'], [5, 9, 'member'],
            
            // Fitness Group
            [6, 6, 'admin'], [6, 7, 'member'], [6, 8, 'member'], [6, 9, 'member'], [6, 10, 'member'],
            
            // Food Lovers
            [7, 7, 'admin'], [7, 8, 'member'], [7, 9, 'member'], [7, 10, 'member'],
            
            // Travel Enthusiasts
            [8, 8, 'admin'], [8, 9, 'member'], [8, 10, 'member']
        ];
        
        for (const [groupId, userId, role] of groupMemberships) {
            await connection.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, role]
            );
        }
        
        // Insert sample messages
        console.log('💬 Creating sample messages...');
        const sampleMessages = [
            // Fun Friday Group messages
            [1, 1, 'Hey everyone! Ready for another fun Friday? 🎉', FALSE, NOW() - INTERVAL 2 HOUR],
            [1, 2, 'Absolutely! What activities do we have planned?', FALSE, NOW() - INTERVAL 1 HOUR 45 MINUTE],
            [1, 3, 'I heard we might be doing a virtual escape room!', TRUE, NOW() - INTERVAL 1 HOUR 30 MINUTE],
            [1, 4, 'That sounds amazing! Count me in!', FALSE, NOW() - INTERVAL 1 HOUR 15 MINUTE],
            [1, 5, 'Same here! When does it start?', FALSE, NOW() - INTERVAL 1 HOUR],
            [1, 1, 'We\'ll start at 3 PM. I\'ll send the link in a few minutes!', FALSE, NOW() - INTERVAL 45 MINUTE],
            [1, 6, 'Perfect timing! I just finished my lunch break', FALSE, NOW() - INTERVAL 30 MINUTE],
            [1, 7, 'Can\'t wait! This is going to be so much fun!', TRUE, NOW() - INTERVAL 15 MINUTE],
            
            // Tech Talk messages
            [2, 2, 'Welcome to Tech Talk! Let\'s discuss the latest in AI and machine learning', FALSE, NOW() - INTERVAL 3 HOUR],
            [2, 1, 'Has anyone tried the new React 18 features? The concurrent rendering is game-changing!', FALSE, NOW() - INTERVAL 2 HOUR 30 MINUTE],
            [2, 3, 'Yes! I\'ve been using it in production for a month now. The performance improvements are incredible', FALSE, NOW() - INTERVAL 2 HOUR 15 MINUTE],
            [2, 4, 'What about the new Next.js 13? The app directory structure is so much cleaner', FALSE, NOW() - INTERVAL 2 HOUR],
            [2, 5, 'I\'m still on Next.js 12. Is the migration worth it?', FALSE, NOW() - INTERVAL 1 HOUR 45 MINUTE],
            [2, 2, 'Definitely! The new routing system alone makes it worth the upgrade', FALSE, NOW() - INTERVAL 1 HOUR 30 MINUTE],
            
            // Random Chat messages
            [3, 3, 'Good morning everyone! ☀️', FALSE, NOW() - INTERVAL 4 HOUR],
            [3, 1, 'Morning! Ready for another great day', FALSE, NOW() - INTERVAL 3 HOUR 45 MINUTE],
            [3, 2, 'Anyone else having coffee right now? ☕', FALSE, NOW() - INTERVAL 3 HOUR 30 MINUTE],
            [3, 4, 'Just finished my second cup!', FALSE, NOW() - INTERVAL 3 HOUR 15 MINUTE],
            [3, 5, 'I need to cut back on caffeine 😅', FALSE, NOW() - INTERVAL 3 HOUR],
            [3, 6, 'Same here! But it\'s so hard to resist', TRUE, NOW() - INTERVAL 2 HOUR 45 MINUTE],
            
            // Project Alpha messages
            [4, 4, 'Project Alpha status update: We\'re 80% complete!', FALSE, NOW() - INTERVAL 5 HOUR],
            [4, 1, 'Excellent progress! What\'s the remaining 20%?', FALSE, NOW() - INTERVAL 4 HOUR 45 MINUTE],
            [4, 2, 'Mainly testing and documentation. Should be done by next week', FALSE, NOW() - INTERVAL 4 HOUR 30 MINUTE],
            [4, 3, 'Great work team! 🎉', FALSE, NOW() - INTERVAL 4 HOUR 15 MINUTE],
            
            // Book Club messages
            [5, 5, 'This month\'s book: "Atomic Habits" by James Clear', FALSE, NOW() - INTERVAL 6 HOUR],
            [5, 6, 'I\'ve read it! Such a great book on building good habits', FALSE, NOW() - INTERVAL 5 HOUR 45 MINUTE],
            [5, 7, 'I\'m halfway through. The concept of habit stacking is fascinating', FALSE, NOW() - INTERVAL 5 HOUR 30 MINUTE],
            [5, 8, 'When is our discussion meeting?', FALSE, NOW() - INTERVAL 5 HOUR 15 MINUTE],
            [5, 5, 'Next Friday at 7 PM. I\'ll send the Zoom link', FALSE, NOW() - INTERVAL 5 HOUR],
            
            // Fitness Group messages
            [6, 6, 'Morning workout complete! 💪', FALSE, NOW() - INTERVAL 7 HOUR],
            [6, 7, 'Nice! What did you do today?', FALSE, NOW() - INTERVAL 6 HOUR 45 MINUTE],
            [6, 8, 'I did a 30-minute HIIT session. Feeling energized!', FALSE, NOW() - INTERVAL 6 HOUR 30 MINUTE],
            [6, 9, 'I need motivation to start working out again 😅', FALSE, NOW() - INTERVAL 6 HOUR 15 MINUTE],
            [6, 10, 'You got this! Start small and build up gradually', FALSE, NOW() - INTERVAL 6 HOUR],
            
            // Food Lovers messages
            [7, 7, 'Just tried this amazing new restaurant downtown!', FALSE, NOW() - INTERVAL 8 HOUR],
            [7, 8, 'What did you have?', FALSE, NOW() - INTERVAL 7 HOUR 45 MINUTE],
            [7, 9, 'The pasta was incredible! I\'ll share the recipe', FALSE, NOW() - INTERVAL 7 HOUR 30 MINUTE],
            [7, 10, 'Please do! I love trying new pasta recipes', FALSE, NOW() - INTERVAL 7 HOUR 15 MINUTE],
            
            // Travel Enthusiasts messages
            [8, 8, 'Planning a trip to Japan next spring! Any recommendations?', FALSE, NOW() - INTERVAL 9 HOUR],
            [8, 9, 'Tokyo is a must! The food scene is incredible', FALSE, NOW() - INTERVAL 8 HOUR 45 MINUTE],
            [8, 10, 'Don\'t miss Kyoto! The temples are breathtaking', FALSE, NOW() - INTERVAL 8 HOUR 30 MINUTE],
            [8, 8, 'Thanks for the tips! I\'ll add them to my itinerary', FALSE, NOW() - INTERVAL 8 HOUR 15 MINUTE]
        ];
        
        for (const [groupId, userId, content, isAnonymous, createdAt] of sampleMessages) {
            await connection.execute(
                'INSERT INTO messages (group_id, user_id, content, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)',
                [groupId, userId, content, isAnonymous, createdAt]
            );
        }
        
        // Insert some message status records
        console.log('📊 Creating message status records...');
        const messageStatuses = [
            [1, 2, 'read'], [1, 3, 'read'], [1, 4, 'delivered'], [1, 5, 'read'],
            [2, 1, 'read'], [2, 3, 'read'], [2, 4, 'delivered'], [2, 5, 'read'],
            [3, 1, 'read'], [3, 2, 'read'], [3, 4, 'delivered'], [3, 5, 'read'],
            [4, 1, 'read'], [4, 2, 'read'], [4, 3, 'delivered'],
            [5, 6, 'read'], [5, 7, 'read'], [5, 8, 'delivered'],
            [6, 7, 'read'], [6, 8, 'read'], [6, 9, 'delivered'], [6, 10, 'read'],
            [7, 8, 'read'], [7, 9, 'read'], [7, 10, 'delivered'],
            [8, 9, 'read'], [8, 10, 'read']
        ];
        
        for (const [messageId, userId, status] of messageStatuses) {
            await connection.execute(
                'INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, ?)',
                [messageId, userId, status]
            );
        }
        
        console.log('🎉 Database seeding completed successfully!');
        console.log('\n📋 Sample Data Summary:');
        console.log('👥 Users: 10 sample users created');
        console.log('🏢 Groups: 8 sample groups created');
        console.log('💬 Messages: 40+ sample messages created');
        console.log('📊 Status: Message read/delivery status created');
        console.log('\n🔑 Demo Credentials:');
        console.log('Username: john_doe | Password: password123');
        console.log('Username: jane_smith | Password: password123');
        console.log('Username: mike_wilson | Password: password123');
        console.log('Username: sarah_jones | Password: password123');
        console.log('Username: alex_brown | Password: password123');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };

