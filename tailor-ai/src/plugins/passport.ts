import fp from 'fastify-plugin';
import fastifyPassport from '@fastify/passport';
// @ts-ignore
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserModel, { User } from '../models/userModel';
import { FastifyInstance } from 'fastify';

async function passportPlugin(fastify: FastifyInstance, options: any) {
    // Session is now registered globally in app.ts
    fastify.register(fastifyPassport.initialize());
    fastify.register(fastifyPassport.secureSession());

    fastifyPassport.use(
        'google',
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                callbackURL: `${process.env.HOST || 'http://localhost:3000'}/auth/callback/google`
            },
            async function (accessToken: string, refreshToken: string, profile: any, cb: Function) {
                try {
                    console.log('[Google Auth] Callback received for:', profile.emails?.[0].value);
                    // Check if user exists, or create
                    let user = await UserModel.findByEmail(profile.emails?.[0].value || '');
                    if (!user) {
                        console.log('[Google Auth] Creating new user for:', profile.emails?.[0].value);
                        user = await UserModel.create({
                            email: profile.emails?.[0].value,
                            full_name: profile.displayName,
                            google_id: profile.id,
                            avatar: profile.photos?.[0].value
                        });
                    } else {
                        console.log('[Google Auth] Found existing user:', user.email);
                    }
                    return cb(null, user);
                } catch (err: any) {
                    console.error('[Google Auth] Error in strategy callback:', err);
                    return cb(err);
                }
            }
        )
    );

    fastifyPassport.registerUserSerializer(async (user: User, req) => {
        console.log('[Passport Serializer] Serializing user ID:', user.id);
        return user.id;
    });

    fastifyPassport.registerUserDeserializer(async (id: any, req) => {
        console.log('[Passport Deserializer] Deserializing user ID:', id);
        const user = await UserModel.findById(id);
        if (!user) {
            console.log('[Passport Deserializer] User NOT found for ID:', id);
        }
        return user;
    });
}

export default fp(passportPlugin);
