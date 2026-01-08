import { FastifyReply, FastifyRequest } from 'fastify';
import UserModel from '../models/userModel';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

const uploadController = {
    // Upload Avatar Image
    uploadAvatar: async (req: FastifyRequest, reply: FastifyReply) => {
        // Verify JWT token
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        try {
            // Get the uploaded file
            const data = await req.file();

            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }

            // Validate file type (only images)
            const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedMimeTypes.includes(data.mimetype)) {
                return reply.status(400).send({
                    error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
                });
            }

            // Generate unique filename
            const fileExtension = path.extname(data.filename);
            const uniqueFilename = `avatar_${user.id}_${randomBytes(8).toString('hex')}${fileExtension}`;

            // Create uploads directory if it doesn't exist
            const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Save file path
            const filePath = path.join(uploadDir, uniqueFilename);

            // Save the file
            await pipeline(data.file, fs.createWriteStream(filePath));

            // Create URL for the avatar (accessible via static file serving)
            const avatarUrl = `/uploads/avatars/${uniqueFilename}`;

            // Update user's avatar in database
            const updatedUser = await UserModel.update(user.id, { avatar: avatarUrl });

            console.log(`✅ Avatar uploaded successfully for user ${user.id}: ${avatarUrl}`);

            return reply.send({
                success: true,
                message: 'Avatar uploaded successfully',
                user: updatedUser,
                avatarUrl: avatarUrl
            });

        } catch (error) {
            console.error('❌ Error uploading avatar:', error);
            return reply.status(500).send({ error: 'Failed to upload avatar' });
        }
    }
};

export default uploadController;
