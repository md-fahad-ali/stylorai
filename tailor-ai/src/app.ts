import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import path from 'path';
import view from '@fastify/view';
import ejs from 'ejs';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';

import passportPlugin from './plugins/passport';
import jwtPlugin from './plugins/jwt';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import fashionRoutes from './routes/fashionRoutes';
import uploadRoutes from './routes/uploadRoutes';
import cartRoutes from './routes/cartRoutes';

function build(opts: FastifyServerOptions = {}) {
    const app: FastifyInstance = fastify(opts);

    // Register View Engine
    app.register(view, {
        engine: {
            ejs: ejs
        },
        root: path.join(__dirname, 'views'),
        viewExt: 'ejs'
    });

    // Register CORS
    app.register(cors, {
        origin: [
            'https://dashboard.stylorai.com',
            'http://localhost:5173',
            'http://localhost:3000',
            /^http:\/\/localhost:\d+$/ // Allow any localhost port
        ],
        credentials: true,
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS']
    });

    // Register Multipart for file uploads
    app.register(multipart, {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB max file size
        }
    });

    // Serve static files (uploaded avatars)
    app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'uploads'),
        prefix: '/uploads/',
    });

    // Serve public files (logo, etc.)
    app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public'),
        prefix: '/public/',
        decorateReply: false // Required when registering plugin multiple times
    });

    // Serve logo specifically at /logo/
    app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public', 'logo'),
        prefix: '/logo/',
        decorateReply: false
    });

    // Serve generated outfits
    app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public', 'generated-outfits'),
        prefix: '/generated-outfits/',
        decorateReply: false
    });

    // Register Plugins
    app.register(require('@fastify/secure-session'), {
        secret: process.env.COOKIE_SECRET || 'a_very_long_secret_string_for_cookie_signing_at_least_32_chars',
        salt: 'mq9hDxBVDbspDR6n',
        cookie: {
            path: '/',
            httpOnly: true
        }
    });

    app.register(passportPlugin);
    app.register(jwtPlugin);

    // Global hook to trace authentication across all routes
    app.addHook('preHandler', async (req, reply) => {
        const user = (req as any).user;
        if (user) {
            req.log.info(`[Global Trace] Request: ${req.url}, User: ${user.email}`);
        } else {
            req.log.info(`[Global Trace] Request: ${req.url}, User: Guest`);
        }
    });

    // Register Routes
    app.register(authRoutes, { prefix: '/auth' });
    app.register(userRoutes, { prefix: '/user' });
    app.register(dashboardRoutes, { prefix: '/dashboard' });
    app.register(fashionRoutes, { prefix: '/fashion' });
    app.register(uploadRoutes, { prefix: '/upload' });
    app.register(cartRoutes, { prefix: '/cart' });

    app.get('/', async (req, reply) => {
        return reply.view('login', { title: 'Home' });
    });

    return app;
}

export default build;
