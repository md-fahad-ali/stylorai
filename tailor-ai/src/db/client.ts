import { Pool } from 'pg';

console.log(`[DB] Connecting to ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tailorai_db',
    password: process.env.DB_PASSWORD || 'password',
    port: Number(process.env.DB_PORT) || 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default { query, pool };
