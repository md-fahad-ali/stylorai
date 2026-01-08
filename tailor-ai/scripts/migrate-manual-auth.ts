import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'tailorai_db',
});

async function migrate() {
    try {
        await client.connect();
        console.log('🔌 Connected to database. Starting migration...');

        // 1. Make google_id nullable
        console.log('Making google_id nullable...');
        await client.query('ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;');

        // 2. Add password column
        console.log('Adding password column...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);');

        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (err: any) {
        if (err.code === '42701') { // duplicate_column
            console.log('ℹ️ Password column might already be there.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
