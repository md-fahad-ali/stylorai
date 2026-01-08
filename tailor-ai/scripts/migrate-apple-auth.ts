
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Fix for loading .env file from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tailorai_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const client = new Client(dbConfig);

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // Add apple_id column to users table
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE;
        `);

        console.log('Successfully added apple_id column to users table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
