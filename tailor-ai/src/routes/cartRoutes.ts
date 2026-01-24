import { FastifyInstance } from 'fastify';
import { addToCart, getCart, removeFromCart } from '../controllers/cartController';

async function cartRoutes(fastify: FastifyInstance) {
    fastify.post('/', { onRequest: [fastify.authenticate] }, addToCart);
    fastify.get('/', { onRequest: [fastify.authenticate] }, getCart);
    fastify.delete('/:id', { onRequest: [fastify.authenticate] }, removeFromCart);
}

export default cartRoutes;
