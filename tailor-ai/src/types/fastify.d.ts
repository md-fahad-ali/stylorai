import 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        jwt: {
            sign: (payload: any, options?: any) => string;
            verify: (token: string) => any;
        };
    }

    interface FastifyRequest {
        jwtVerify: () => Promise<void>;
        user?: any;
        jwtUser?: any;
    }
}
