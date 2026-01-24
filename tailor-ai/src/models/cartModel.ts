import * as db from '../db/client';

export interface CartItem {
    id?: number;
    user_id: number;
    title: string;
    price: string;
    buy_now_url: string;
    image_url: string;
    created_at?: Date;
}

const CartModel = {
    addToCart: async (cartItem: CartItem): Promise<CartItem> => {
        const { user_id, title, price, buy_now_url, image_url } = cartItem;
        const { rows } = await db.query(
            'INSERT INTO cart (user_id, title, price, buy_now_url, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [user_id, title, price, buy_now_url, image_url]
        );
        return rows[0];
    },

    getCartByUser: async (userId: number | string): Promise<CartItem[]> => {
        const { rows } = await db.query('SELECT * FROM cart WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return rows;
    },

    removeFromCart: async (id: number | string, userId: number | string): Promise<boolean> => {
        const { rowCount } = await db.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [id, userId]);
        return (rowCount || 0) > 0;
    },

    clearCart: async (userId: number | string): Promise<boolean> => {
        const { rowCount } = await db.query('DELETE FROM cart WHERE user_id = $1', [userId]);
        return (rowCount || 0) > 0;
    }
};

export default CartModel;
