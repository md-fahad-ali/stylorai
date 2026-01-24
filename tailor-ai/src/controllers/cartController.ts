import { FastifyRequest, FastifyReply } from 'fastify';
import CartModel from '../models/cartModel';
import { User } from '../models/userModel';

export const addToCart = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = ((req as any).user || (req as any).jwtUser) as User;
        if (!user || !user.id) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const { title, price, buy_now_url, image_url } = req.body as any;

        if (!title || !buy_now_url || !image_url) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        const cartItem = await CartModel.addToCart({
            user_id: Number(user.id),
            title,
            price,
            buy_now_url,
            image_url
        });

        return reply.status(201).send(cartItem);
    } catch (error) {
        req.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};

export const getCart = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = ((req as any).user || (req as any).jwtUser) as User;
        if (!user || !user.id) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const cartItems = await CartModel.getCartByUser(user.id);
        return reply.send(cartItems);
    } catch (error) {
        req.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};

export const removeFromCart = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const user = ((req as any).user || (req as any).jwtUser) as User;
        if (!user || !user.id) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const { id } = req.params as { id: string };
        const success = await CartModel.removeFromCart(id, user.id);

        if (!success) {
            return reply.status(404).send({ error: 'Item not found in cart' });
        }

        return reply.send({ success: true });
    } catch (error) {
        req.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};
