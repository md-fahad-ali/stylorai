import { FastifyInstance } from 'fastify';
import uploadController from '../controllers/uploadController';

async function uploadRoutes(fastify: FastifyInstance) {
    // POST /upload/avatar - Upload avatar image (Protected with JWT)
    fastify.post('/avatar', uploadController.uploadAvatar);
}

export default uploadRoutes;
