import * as db from '../db/client';

export interface FashionItem {
    id?: number;
    user_id: number | string;
    original_image_path: string;
    generated_image_path: string;
    title?: string;
    created_at?: Date;
}

const FashionItemModel = {
    create: async (item: FashionItem): Promise<FashionItem> => {
        const { user_id, original_image_path, generated_image_path, title } = item;
        const { rows } = await db.query(
            `INSERT INTO fashion_items (user_id, original_image_path, generated_image_path, title) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [user_id, original_image_path, generated_image_path, title || null]
        );
        return rows[0];
    },

    findByUserId: async (userId: number | string): Promise<FashionItem[]> => {
        const { rows } = await db.query(
            'SELECT * FROM fashion_items WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    findById: async (id: number | string): Promise<FashionItem | undefined> => {
        const { rows } = await db.query('SELECT * FROM fashion_items WHERE id = $1', [id]);
        return rows[0];
    }
};

export default FashionItemModel;
