import * as db from '../db/client';

export interface WardrobeItem {
    id?: number;
    user_id: number | string;
    image_path: string;
    title?: string;
    created_at?: Date;
}

const WardrobeModel = {
    create: async (item: WardrobeItem): Promise<WardrobeItem> => {
        const { user_id, image_path, title } = item;
        const { rows } = await db.query(
            `INSERT INTO wardrobe (user_id, image_path, title) 
             VALUES ($1, $2, $3) RETURNING *`,
            [user_id, image_path, title || null]
        );
        return rows[0];
    },

    findByUserId: async (userId: number | string): Promise<WardrobeItem[]> => {
        const { rows } = await db.query(
            'SELECT * FROM wardrobe WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    findById: async (id: number | string): Promise<WardrobeItem | undefined> => {
        const { rows } = await db.query('SELECT * FROM wardrobe WHERE id = $1', [id]);
        return rows[0];
    },

    delete: async (id: number | string, userId: number | string): Promise<boolean> => {
        const { rowCount } = await db.query(
            'DELETE FROM wardrobe WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return (rowCount || 0) > 0;
    },

    countAll: async (): Promise<number> => {
        const { rows } = await db.query('SELECT COUNT(*) FROM wardrobe');
        return parseInt(rows[0].count, 10);
    }
};

export default WardrobeModel;
