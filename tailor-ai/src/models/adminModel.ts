import * as db from '../db/client';
import 'dotenv/config';

interface AdminSettings {
    id: number;
    full_name: string;
    email: string;
    role: string;
    theme: string;
    notifications: boolean;
    updated_at: Date;
}

const AdminModel = {
    // Get admin settings (should only be one row)
    async getSettings(): Promise<AdminSettings | null> {
        const result = await db.query('SELECT * FROM admin_settings LIMIT 1');
        return result.rows[0] || null;
    },

    // Update admin settings
    async updateSettings(data: {
        full_name?: string;
        email?: string;
        role?: string;
        theme?: string;
        notifications?: boolean;
    }): Promise<AdminSettings> {
        try {
            // First check if admin exists
            const existing = await this.getSettings();

            if (!existing) {
                // Create if doesn't exist
                const result = await db.query(
                    `INSERT INTO admin_settings (full_name, email, role, theme, notifications, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
                    [
                        data.full_name || 'Admin User',
                        data.email || 'admin@stylo.ai',
                        data.role || 'Administrator',
                        data.theme || 'system',
                        data.notifications !== undefined ? data.notifications : true
                    ]
                );
                return result.rows[0];
            }

            // Build UPDATE SET clause dynamically  
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (data.full_name !== undefined) {
                updates.push(`full_name = $${paramIndex++}`);
                values.push(data.full_name);
            }
            if (data.email !== undefined) {
                updates.push(`email = $${paramIndex++}`);
                values.push(data.email);
            }
            if (data.role !== undefined) {
                updates.push(`role = $${paramIndex++}`);
                values.push(data.role);
            }
            if (data.theme !== undefined) {
                updates.push(`theme = $${paramIndex++}`);
                values.push(data.theme);
            }
            if (data.notifications !== undefined) {
                updates.push(`notifications = $${paramIndex++}`);
                values.push(data.notifications);
            }

            updates.push(`updated_at = NOW()`);

            const result = await db.query(
                `UPDATE admin_settings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                [...values, existing.id]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Error in AdminModel.updateSettings:', error);
            throw error;
        }
    },
};

export default AdminModel;
