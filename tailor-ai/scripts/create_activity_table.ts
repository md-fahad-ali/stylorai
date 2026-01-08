import { query } from '../src/db/client';
import 'dotenv/config';

async function createUserActivityTable() {
    try {
        console.log('Creating user_activity table...');

        await query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'signup', 'upload'
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('✅ user_activity table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating user_activity table:', error);
        process.exit(1);
    }
}

createUserActivityTable();
