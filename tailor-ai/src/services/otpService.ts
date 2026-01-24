import UserModel from '../models/userModel';
import bcrypt from 'bcryptjs';

interface OTPRecord {
    email: string;
    otp: string;
    hashedOTP: string;
    expiresAt: Date;
}

const otpService = {
    /**
     * Generate a random 6-digit OTP
     */
    generateOTP: (): string => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    /**
     * Store OTP in database with 10-minute expiration
     */
    storeOTP: async (email: string, otp: string): Promise<void> => {
        try {
            // Find user by email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }

            // Hash the OTP
            const hashedOTP = await bcrypt.hash(otp, 10);

            // Delete any existing OTP/tokens for this user
            await UserModel.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

            // Set expiration to 3 minutes from now
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 3);

            // Insert new OTP record (store hashed OTP in token column)
            await UserModel.query(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, hashedOTP, expiresAt]
            );

            console.log(`✅ OTP stored for user: ${email}, expires at: ${expiresAt.toISOString()}`);
        } catch (error) {
            console.error('❌ Error storing OTP:', error);
            throw new Error('Failed to store OTP');
        }
    },

    /**
     * Verify OTP is valid and not expired
     */
    verifyOTP: async (email: string, otp: string): Promise<boolean> => {
        try {
            // Find user by email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return false;
            }

            // Get non-expired OTP records for this user
            const result = await UserModel.query(
                'SELECT id, token FROM password_reset_tokens WHERE user_id = $1 AND expires_at > NOW()',
                [user.id]
            );

            if (result.rows.length === 0) {
                return false;
            }

            const record = result.rows[0];

            // Verify OTP against hashed token
            return await bcrypt.compare(otp, record.token);

        } catch (error) {
            console.error('❌ Error verifying OTP:', error);
            return false;
        }
    },

    /**
     * Get user ID from valid OTP
     */
    getUserIdFromOTP: async (email: string, otp: string): Promise<number | null> => {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return null;
            }

            const result = await UserModel.query(
                'SELECT user_id, token FROM password_reset_tokens WHERE user_id = $1 AND expires_at > NOW()',
                [user.id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const record = result.rows[0];
            const isValid = await bcrypt.compare(otp, record.token);

            if (!isValid) {
                return null;
            }

            return record.user_id;
        } catch (error) {
            console.error('❌ Error getting user ID from OTP:', error);
            return null;
        }
    },

    /**
     * Invalidate/delete OTP after successful use
     */
    invalidateOTP: async (email: string): Promise<void> => {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return;
            }

            await UserModel.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
            console.log(`✅ OTP invalidated for user: ${email}`);
        } catch (error) {
            console.error('❌ Error invalidating OTP:', error);
            throw new Error('Failed to invalidate OTP');
        }
    }
};

export default otpService;
