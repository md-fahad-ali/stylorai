import { query } from '../src/db/client';
import 'dotenv/config';

async function addAdminSettingsTable() {
  try {
    console.log('Creating admin_settings table...');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL DEFAULT 'Admin User',
        email VARCHAR(255) NOT NULL DEFAULT 'admin@stylo.ai',
        role VARCHAR(100) NOT NULL DEFAULT 'Administrator',
        theme VARCHAR(20) DEFAULT 'system',
        notifications BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting default admin settings...');
    await query(`
      INSERT INTO admin_settings (full_name, email, role, theme, notifications)
      SELECT 'Admin User', 'admin@stylo.ai', 'Administrator', 'system', true
      WHERE NOT EXISTS (SELECT 1 FROM admin_settings LIMIT 1)
    `);

    console.log('✅ Admin settings table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin_settings table:', error);
    process.exit(1);
  }
}

addAdminSettingsTable();
