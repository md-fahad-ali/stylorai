import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        jwt: {
            sign: (payload: any, options?: jwt.SignOptions) => string;
            verify: (token: string) => any;
        };
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
    interface FastifyRequest {
        jwtVerify: () => Promise<void>;
        jwtUser?: any;
    }
}

const SECRET = process.env.JWT_SECRET || 'supersecret';

async function jwtPlugin(fastify: FastifyInstance, options: any) {

    // Decorate server with utility functions
    fastify.decorate('jwt', {
        sign: (payload: any, options?: jwt.SignOptions) => {
            return jwt.sign(payload, SECRET, options);
        },
        verify: (token: string) => {
            return jwt.verify(token, SECRET);
        }
    });

    // Decorate request with authenticate method
    fastify.decorateRequest('jwtVerify', async function () {
        const req = this as FastifyRequest;

        // If already authenticated via Passport session, we can skip JWT check
        if ((req as any).user) {
            console.log('[JWT Verify] User already authenticated via session:', (req as any).user.email);
            return;
        }

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                console.log('[JWT Verify] No Authorization header present');
                // We don't throw here, just return. Let authenticate decide what to do.
                return;
            }
            const token = authHeader.split(' ')[1];
            if (!token) {
                throw new Error('Malformed Authorization header');
            }
            const decoded = jwt.verify(token, SECRET);
            (req as any).jwtUser = decoded;
        } catch (err) {
            throw err;
        }
    });

    fastify.decorate('authenticate', async function (req: any, reply: any) {
        await req.jwtVerify();
        if (!req.user && !req.jwtUser) {
            console.log(`[Authenticate] Unauthorized access attempt to ${req.url}`);
            // For web routes, we might want to redirect, but for API we send 401
            const isApi = req.url.startsWith('/api') || req.headers.accept?.includes('application/json');
            if (isApi) {
                return reply.status(401).send({ error: 'Unauthorized' });
            } else {
                return reply.redirect('/auth/login');
            }
        }
        console.log(`[Authenticate] Success for ${req.url}. User: ${req.user?.email || req.jwtUser?.email}`);
    });
}

export default fp(jwtPlugin);
