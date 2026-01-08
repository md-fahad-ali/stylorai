import { FastifyInstance } from 'fastify';
import authController from '../controllers/authController';

async function userRoutes(fastify: FastifyInstance, options: any) {
    // Optional Protection logic handled inside the controller
    fastify.get('/profile', authController.profile);
    fastify.post('/profile/update', authController.updateProfile);

    // Update Fashion Preferences Only
    fastify.post('/fashion-preferences/update', authController.updateFashionPreferences);

    // JSON Profile (Mobile) - Keeping hard protection for now unless specified otherwise
    // @ts-ignore
    fastify.get('/me', { onRequest: [fastify.authenticate] }, authController.me);
}

export default userRoutes;
