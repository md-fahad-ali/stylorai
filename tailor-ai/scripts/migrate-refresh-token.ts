import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const db = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: 'localhost',
    database: process.env.DB_NAME || 'tailorai_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

const migrate = async () => {
    try {
        console.log('🔌 Connected to database. Starting migration...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Migration successful! `refresh_tokens` table created.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await db.end();
    }
};

migrate();
