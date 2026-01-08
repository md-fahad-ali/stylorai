
import 'dotenv/config';
import db from '../src/db/client';

async function migrate() {
    try {
        console.log('Adding title column to favorite_outfits...');
        await db.query(`ALTER TABLE favorite_outfits ADD COLUMN IF NOT EXISTS title VARCHAR(255);`);
        await db.query(`ALTER TABLE favorite_outfits ADD COLUMN IF NOT EXISTS description TEXT;`);
        console.log('✅ Migration successful: Added title and description columns');
        process.exit(0);
    } catch (error: any) {
        if (error.code === '42P01') { // undefined_table
            console.log('⚠️ Table favorite_outfits does not exist. Creating it...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS favorite_outfits (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    image_url TEXT NOT NULL,
                    title VARCHAR(255),
                    description TEXT,
                    products JSONB DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_favorite_outfits_user_id ON favorite_outfits(user_id);
            `);
            console.log('✅ Migration successful: Created table');
            process.exit(0);
        }
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
