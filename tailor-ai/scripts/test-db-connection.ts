import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    host: 'localhost', // Testing from host network
    port: 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'tailorai_db',
});

async function testConnection() {
    try {
        console.log('Testing connection to database...');
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ Connection Successful!');
        console.log('Database Time:', res.rows[0].now);
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection Failed:', err);
        process.exit(1);
    }
}

testConnection();
