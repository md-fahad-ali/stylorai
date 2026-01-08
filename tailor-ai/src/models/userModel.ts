import * as db from '../db/client';

export interface User {
    id?: number | string;
    google_id?: string;
    email: string;
    password?: string;
    full_name?: string;
    avatar?: string;
    birthdate?: Date | string;
    gender?: string;
    country?: string;
    apple_id?: string;
    created_at?: Date;
}

const UserModel = {
    findById: async (id: string | number): Promise<User | undefined> => {
        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        return rows[0];
    },
    findByEmail: async (email: string): Promise<User | undefined> => {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0];
    },
    create: async (userData: Partial<User>): Promise<User> => {
        const { google_id, apple_id, email, password, full_name, avatar } = userData;
        const { rows } = await db.query(
            'INSERT INTO users (google_id, apple_id, email, password, full_name, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [google_id || null, apple_id || null, email, password || null, full_name, avatar]
        );
        return rows[0];
    },
    update: async (id: number | string, userData: Partial<User>): Promise<User | undefined> => {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        for (const [key, value] of Object.entries(userData)) {
            // whitelist fields to update
            if (['full_name', 'email', 'avatar', 'birthdate', 'gender', 'country'].includes(key)) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }

        if (fields.length === 0) return undefined;

        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const { rows } = await db.query(query, values);
        return rows[0];
    },
    async findByGoogleId(googleId: string): Promise<User | null> {
        const res = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
        return res.rows[0] || null;
    },

    async findByAppleId(appleId: string): Promise<User | null> {
        const res = await db.query('SELECT * FROM users WHERE apple_id = $1', [appleId]);
        return res.rows[0] || null;
    },

    findAll: async (options: { limit?: number; offset?: number; search?: string } = {}): Promise<User[]> => {
        let query = 'SELECT * FROM users';
        const values: any[] = [];
        let idx = 1;

        if (options.search) {
            query += ` WHERE email ILIKE $${idx} OR full_name ILIKE $${idx}`;
            values.push(`%${options.search}%`);
            idx++;
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ` LIMIT $${idx}`;
            values.push(options.limit);
            idx++;
        }

        if (options.offset) {
            query += ` OFFSET $${idx}`;
            values.push(options.offset);
            idx++;
        }

        const { rows } = await db.query(query, values);
        return rows;
    },

    countWithSearch: async (search?: string): Promise<number> => {
        let query = 'SELECT COUNT(*) FROM users';
        const values: any[] = [];

        if (search) {
            query += ' WHERE email ILIKE $1 OR full_name ILIKE $1';
            values.push(`%${search}%`);
        }

        const { rows } = await db.query(query, values);
        return parseInt(rows[0].count, 10);
    },

    getAll: async (): Promise<User[]> => {
        const { rows } = await db.query('SELECT * FROM users ORDER BY created_at DESC');
        return rows;
    },
    query: async (text: string, params?: any[]) => {
        return db.query(text, params);
    },
    countAll: async (): Promise<number> => {
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        return parseInt(rows[0].count, 10);
    },
    delete: async (id: number | string): Promise<boolean> => {
        const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
        return (rowCount || 0) > 0;
    }
};

export default UserModel;
