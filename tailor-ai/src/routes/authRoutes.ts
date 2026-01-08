import { FastifyInstance } from 'fastify';
import fastifyPassport from '@fastify/passport';
import authController from '../controllers/authController';

async function authRoutes(fastify: FastifyInstance, options: any) {
    // Login Page
    fastify.get('/login', authController.loginPage);

    // Google Auth Trigger
    fastify.get(
        '/login/google',
        // @ts-ignore
        fastifyPassport.authenticate('google', { scope: ['profile', 'email'] })
    );

    // Mobile Native Login (POST with idToken)
    fastify.post('/google/mobile', authController.mobileLogin);
    fastify.post('/apple/mobile', authController.appleLogin);

    // Manual Authentication
    fastify.post('/register', authController.register);
    fastify.post('/login', authController.login);

    // Mobile Auth & User Info
    fastify.post('/refresh', authController.refreshToken);
    fastify.get('/me', { preHandler: [fastify.authenticate] }, authController.me);

    // Google Auth Callback
    fastify.get(
        '/callback/google',
        {
            // @ts-ignore
            preValidation: fastifyPassport.authenticate('google', {
                failureRedirect: '/auth/login',
            })
        },
        authController.success
    );

    // Password Reset Routes (OTP-based)
    fastify.post('/password-reset/request', authController.requestPasswordReset);
    fastify.post('/password-reset/verify-otp', authController.verifyResetOTP);
    fastify.post('/password-reset/reset', authController.resetPassword);

    // Logout
    fastify.get('/logout', authController.logout);
}

export default authRoutes;
