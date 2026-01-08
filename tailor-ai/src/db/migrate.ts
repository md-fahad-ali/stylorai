import fs from 'fs';
import path from 'path';
import { query } from './client';
import dotenv from 'dotenv';
dotenv.config();

const runMigration = async () => {
    try {
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).sort(); // Ensure order by filename

        console.log(`Found ${files.length} migrations.`);

        for (const file of files) {
            if (path.extname(file) === '.sql') {
                const migrationPath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(migrationPath, 'utf-8');

                console.log(`Running migration: ${file}`);
                await query(sql);
                console.log(`✅ ${file} applied successfully.`);
            }
        }

        console.log('🎉 All migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

runMigration();
