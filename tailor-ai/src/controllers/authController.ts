import { FastifyReply, FastifyRequest } from 'fastify';
import UserModel from '../models/userModel';
import FashionPreferencesModel from '../models/fashionPreferencesModel';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcryptjs';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authController = {
    // Render Login Page
    loginPage: async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.isAuthenticated()) {
            return reply.redirect('/user/profile');
        }
        return reply.view('login', { title: 'Login with Google' });
    },

    // Handle Logout
    logout: async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.user) {
            const user = req.user as any;
            try {
                // Log logout activity
                await UserModel.query(
                    'INSERT INTO user_activity (user_id, action, created_at) VALUES ($1, $2, NOW())',
                    [user.id, 'logout']
                );
            } catch (err) {
                console.error('Failed to log logout activity', err);
            }
        }
        req.logout();
        return reply.redirect('/');
    },

    success: async (req: FastifyRequest, reply: FastifyReply) => {
        // req.user is set by Passport (session)
        const user = (req as any).user;

        if (!user) {
            console.log('[Auth Success] No user found in request');
            return reply.redirect('/auth/login');
        }

        console.log('[Auth Success] Authenticated:', user.email);

        // Log login activity
        try {
            await UserModel.query(
                'INSERT INTO user_activity (user_id, action, created_at) VALUES ($1, $2, NOW())',
                [user.id, 'login']
            );
        } catch (err) {
            console.error('Failed to log login activity', err);
        }

        // Generate Tokens for Mobile/API
        // @ts-ignore
        const accessToken = (req.server as any).jwt.sign({ id: user.id || 0, email: user.email, name: user.full_name }, { expiresIn: '15m' });

        const refreshToken = require('crypto').randomBytes(40).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

        await UserModel.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [refreshToken, user.id, expiresAt]);

        // If it's a browser request (not API), redirect to profile
        const isApi = req.headers.accept?.includes('application/json');
        if (isApi) {
            return reply.send({ token: accessToken, refreshToken, user });
        } else {
            return reply.redirect('/user/profile');
        }
    },

    // Profile View (Protected via JWT/Passport - now optional)
    profile: async (req: FastifyRequest, reply: FastifyReply) => {
        // Attempt to verify JWT if present, but don't fail if it's not
        try {
            await req.jwtVerify();
        } catch (err) {
            // Ignore error, we'll check user/jwtUser below
        }

        const user = (req as any).user || (req as any).jwtUser;

        if (!user) {
            const isApi = req.headers.accept?.includes('application/json');
            if (isApi) {
                return reply.send({ message: 'Not authenticated user' });
            }
            // For browser, we can show a view or simple text
            return reply.send('Not authenticated user');
        }

        // Fetch fashion preferences
        const fashionPreferences = await FashionPreferencesModel.findByUserId(user.id);

        const isApi = req.headers.accept?.includes('application/json');
        if (isApi) {
            return reply.send({ user: { ...user, fashionPreferences } });
        }

        return reply.view('profile', { user: user, title: 'Profile' });
    },

    // JSON Profile for Mobile (Compatible with existing /me)
    me: async (req: FastifyRequest, reply: FastifyReply) => {
        const jwtUser = (req as any).user || (req as any).jwtUser;
        if (!jwtUser) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Fetch complete user data from database
        const user = await UserModel.findById(jwtUser.id);
        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        // Fetch fashion preferences
        const fashionPreferences = await FashionPreferencesModel.findByUserId(user.id as number);

        return reply.send({ user: { ...user, fashionPreferences } });
    },

    // Mobile Native Login - Verify ID Token
    mobileLogin: async (req: FastifyRequest, reply: FastifyReply) => {
        const { idToken } = req.body as { idToken: string };

        if (!idToken) {
            return reply.status(400).send({ error: 'Missing idToken' });
        }

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                return reply.status(401).send({ error: 'Invalid token payload' });
            }

            const { sub: googleId, email, name, picture } = payload;

            // Check if user exists
            let user = await UserModel.findByGoogleId(googleId);

            if (!user) {
                user = await UserModel.create({
                    google_id: googleId,
                    email: email!,
                    full_name: name!,
                    avatar: picture
                });
            }

            // Generate Tokens
            // @ts-ignore
            const accessToken = (req.server as any).jwt.sign({ id: user.id, email: user.email, name: user.full_name }, { expiresIn: '15m' });

            const refreshToken = require('crypto').randomBytes(40).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

            await UserModel.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [refreshToken, user.id, expiresAt]);

            return reply.send({ token: accessToken, refreshToken, user });

        } catch (error) {
            req.log.error(error);
            return reply.status(401).send({ error: 'Token verification failed' });
        }
    },

    // Apple Native Login
    appleLogin: async (req: FastifyRequest, reply: FastifyReply) => {
        const { identityToken, fullName } = req.body as { identityToken: string; fullName?: { givenName: string; familyName: string } };

        if (!identityToken) {
            return reply.status(400).send({ error: 'Missing identityToken' });
        }

        try {
            const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
                // Optional: Audience check. If you have multiple apps/services, specify clientID.
                // clientID: process.env.APPLE_CLIENT_ID, 
                // We leave it open or checked implicitly if needed, but for now trusting the token signature is key.
            });

            const { sub: appleId, email } = appleIdTokenClaims;

            // Check if user exists
            let user = await UserModel.findByAppleId(appleId);

            if (!user) {
                // If email is not present in token (Apple only sends it first time), 
                // we might fail if we strictly need email. But for now assuming we get it or have to handle logic.
                // Note: Apple only shares email on FIRST login. 
                const name = fullName ? `${fullName.givenName} ${fullName.familyName}`.trim() : 'Apple User';

                user = await UserModel.create({
                    apple_id: appleId,
                    email: email || `apple_${appleId}@privaterelay.appleid.com`, // Fallback
                    full_name: name,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Apple User')}`
                });
            }

            // Generate Tokens
            // @ts-ignore
            const accessToken = (req.server as any).jwt.sign({ id: user.id, email: user.email, name: user.full_name }, { expiresIn: '15m' });

            const refreshToken = require('crypto').randomBytes(40).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

            await UserModel.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [refreshToken, user.id, expiresAt]);

            return reply.send({ token: accessToken, refreshToken, user });

        } catch (error) {
            req.log.error(error);
            return reply.status(401).send({ error: 'Apple token verification failed' });
        }
    },

    // Manual Registration
    register: async (req: FastifyRequest, reply: FastifyReply) => {
        const { email, password, full_name } = req.body as any;

        if (!email || !password) {
            return reply.status(400).send({ error: 'Email and password are required' });
        }

        try {
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return reply.status(400).send({ error: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await UserModel.create({
                email,
                password: hashedPassword,
                full_name: full_name || 'User',
                // Default avatar or null
            });

            // Log signup activity
            try {
                await UserModel.query(
                    'INSERT INTO user_activity (user_id, action, created_at) VALUES ($1, $2, NOW())',
                    [newUser.id, 'signup']
                );
            } catch (err) {
                console.error('Failed to log signup activity', err);
            }

            return reply.send({ success: true, user: newUser });
        } catch (error) {
            console.error('Registration error:', error);
            return reply.status(500).send({ error: 'Registration failed' });
        }
    },

    // Manual Login
    login: async (req: FastifyRequest, reply: FastifyReply) => {
        const { email, password } = req.body as any;

        if (!email || !password) {
            return reply.status(400).send({ error: 'Missing email or password' });
        }

        try {
            const user = await UserModel.findByEmail(email);
            if (!user || !user.password) {
                return reply.status(401).send({ error: 'Invalid email or password' });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return reply.status(401).send({ error: 'Invalid email or password' });
            }

            // Log login activity
            try {
                await UserModel.query(
                    'INSERT INTO user_activity (user_id, action, created_at) VALUES ($1, $2, NOW())',
                    [user.id, 'login']
                );
            } catch (err) {
                console.error('Failed to log login activity', err);
            }

            // Generate Tokens
            // @ts-ignore
            const accessToken = (req.server as any).jwt.sign({ id: user.id, email: user.email, name: user.full_name }, { expiresIn: '15m' });

            const refreshToken = require('crypto').randomBytes(40).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

            await UserModel.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [refreshToken, user.id, expiresAt]);

            return reply.send({ success: true, token: accessToken, refreshToken, user });
        } catch (err) {
            req.log.error(err);
            return reply.status(500).send({ error: 'Login failed' });
        }
    },

    refreshToken: async (req: FastifyRequest, reply: FastifyReply) => {
        const { refreshToken } = req.body as { refreshToken: string };

        if (!refreshToken) {
            return reply.status(400).send({ error: 'Missing refresh token' });
        }

        try {
            const result = await UserModel.query('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [refreshToken]);
            const tokenRecord = result.rows[0];

            if (!tokenRecord) {
                return reply.status(401).send({ error: 'Invalid or expired refresh token' });
            }

            // Get User
            const user = await UserModel.findById(tokenRecord.user_id);
            if (!user) {
                return reply.status(401).send({ error: 'User not found' });
            }

            // [ROTATION] Delete used refresh token
            await UserModel.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id]);

            // Generate NEW Tokens
            // @ts-ignore
            const newAccessToken = (req.server as any).jwt.sign({ id: user.id, email: user.email, name: user.full_name }, { expiresIn: '15m' });

            const newRefreshToken = require('crypto').randomBytes(40).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

            await UserModel.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [newRefreshToken, user.id, expiresAt]);

            return reply.send({ token: newAccessToken, refreshToken: newRefreshToken });

        } catch (err) {
            req.log.error(err);
            return reply.status(500).send({ error: 'Refresh failed' });
        }
    },

    updateProfile: async (req: FastifyRequest, reply: FastifyReply) => {
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

        const { birthdate, gender, country, avatar, fashionPreferences } = req.body as {
            birthdate?: string;
            gender?: string;
            country?: string;
            avatar?: string;
            fashionPreferences?: {
                season?: string[];
                style?: string[];
                preferencesColor?: string[];
                bodyType?: string;
                skinTone?: string;
            };
        };

        try {
            // Build update object with only provided fields
            const profileUpdates: any = {};
            if (birthdate !== undefined) profileUpdates.birthdate = birthdate;
            if (gender !== undefined) profileUpdates.gender = gender;
            if (country !== undefined) profileUpdates.country = country;
            if (avatar !== undefined) profileUpdates.avatar = avatar;

            // Update user profile (only if there are fields to update)
            let updatedUser = user;
            if (Object.keys(profileUpdates).length > 0) {
                updatedUser = await UserModel.update(user.id, profileUpdates);
            } else {
                // Fetch current user data if no profile updates
                updatedUser = await UserModel.findById(user.id);
            }

            // Update fashion preferences if provided
            let updatedFashionPreferences = null;
            if (fashionPreferences) {
                updatedFashionPreferences = await FashionPreferencesModel.upsert(user.id, {
                    season: fashionPreferences.season,
                    style: fashionPreferences.style,
                    preferences_color: fashionPreferences.preferencesColor,
                    body_type: fashionPreferences.bodyType,
                    skin_tone: fashionPreferences.skinTone,
                });
            } else {
                // Fetch existing preferences
                updatedFashionPreferences = await FashionPreferencesModel.findByUserId(user.id);
            }

            return reply.send({ user: { ...updatedUser, fashionPreferences: updatedFashionPreferences } });
        } catch (err) {
            req.log.error(err);
            return reply.status(500).send({ error: 'Failed to update profile' });
        }
    },

    // Update Fashion Preferences Only
    updateFashionPreferences: async (req: FastifyRequest, reply: FastifyReply) => {
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

        const { season, style, preferencesColor, bodyType, skinTone } = req.body as {
            season?: string[];
            style?: string[];
            preferencesColor?: string[];
            bodyType?: string;
            skinTone?: string;
        };

        try {
            // Update only fashion preferences
            const updatedFashionPreferences = await FashionPreferencesModel.upsert(user.id, {
                season,
                style,
                preferences_color: preferencesColor,
                body_type: bodyType,
                skin_tone: skinTone,
            });

            // Get user data
            const userData = await UserModel.findById(user.id);

            return reply.send({
                user: {
                    ...userData,
                    fashionPreferences: updatedFashionPreferences
                }
            });
        } catch (err) {
            req.log.error(err);
            return reply.status(500).send({ error: 'Failed to update fashion preferences' });
        }
    },

    // Password Reset: Request Reset (OTP-based)
    requestPasswordReset: async (req: FastifyRequest, reply: FastifyReply) => {
        const { email } = req.body as { email: string };

        if (!email) {
            return reply.status(400).send({ error: 'Email is required' });
        }

        try {
            const user = await UserModel.findByEmail(email);

            // Always return success to prevent email enumeration
            const sendSuccess = () => reply.send({
                success: true,
                message: 'If an account with that email exists, a password reset code has been sent.'
            });

            if (!user) {
                return sendSuccess();
            }

            // Generate 6-digit OTP
            const otpService = require('../services/otpService').default;
            const otp = otpService.generateOTP();

            // Store OTP in database
            await otpService.storeOTP(email, otp);

            // Send OTP email
            const { emailService } = require('../services/emailService');
            await emailService.sendPasswordResetOTP(user.email, otp, user.full_name);

            return sendSuccess();

        } catch (error) {
            req.log.error(`Error in requestPasswordReset: ${error}`);
            return reply.status(500).send({ error: 'Failed to process password reset request' });
        }
    },

    // Password Reset: Verify OTP
    verifyResetOTP: async (req: FastifyRequest, reply: FastifyReply) => {
        const { email, otp } = req.body as { email: string; otp: string };

        if (!email || !otp) {
            return reply.status(400).send({ error: 'Email and OTP are required' });
        }

        try {
            const otpService = require('../services/otpService').default;
            const isValid = await otpService.verifyOTP(email, otp);

            if (isValid) {
                return reply.send({ valid: true, message: 'OTP is valid' });
            } else {
                return reply.status(400).send({ valid: false, error: 'Invalid or expired OTP' });
            }

        } catch (error) {
            req.log.error(`Error in verifyResetOTP: ${error}`);
            return reply.status(500).send({ error: 'Failed to verify OTP' });
        }
    },

    // Password Reset: Reset Password with OTP
    resetPassword: async (req: FastifyRequest, reply: FastifyReply) => {
        const { email, otp, newPassword } = req.body as { email: string; otp: string; newPassword: string };

        if (!email || !otp || !newPassword) {
            return reply.status(400).send({ error: 'Email, OTP, and new password are required' });
        }

        if (newPassword.length < 6) {
            return reply.status(400).send({ error: 'Password must be at least 6 characters long' });
        }

        try {
            const otpService = require('../services/otpService').default;

            // Verify OTP
            const isValid = await otpService.verifyOTP(email, otp);
            if (!isValid) {
                return reply.status(400).send({ error: 'Invalid or expired OTP' });
            }

            // Get user ID from OTP
            const userId = await otpService.getUserIdFromOTP(email, otp);
            if (!userId) {
                return reply.status(400).send({ error: 'Invalid OTP' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update user password
            await UserModel.query(
                'UPDATE users SET password = $1 WHERE id = $2',
                [hashedPassword, userId]
            );

            // Invalidate the used OTP
            await otpService.invalidateOTP(email);

            return reply.send({
                success: true,
                message: 'Password has been reset successfully. You can now login with your new password.'
            });

        } catch (error) {
            req.log.error(`Error in resetPassword: ${error}`);
            return reply.status(500).send({ error: 'Failed to reset password' });
        }
    }
};

export default authController;
