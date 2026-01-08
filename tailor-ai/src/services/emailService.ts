import nodemailer from 'nodemailer';
import path from 'path';

// Create SMTP transporter lazily to ensure env vars are loaded
const getTransporter = () => {
    console.log('🔧 SMTP Configuration:', {
        host: process.env.SMTP_HOST || 'MISSING',
        port: process.env.SMTP_PORT || 'MISSING',
        user: process.env.SMTP_USER || 'MISSING',
        pass: process.env.SMTP_PASSWORD ? '***SET***' : 'MISSING'
    });

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'mail.stylorai.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use TLS
        auth: {
            user: process.env.SMTP_USER || 'noreply@stylorai.com',
            pass: process.env.SMTP_PASSWORD || '',
        },
        tls: {
            // Accept self-signed certificates (use with caution in production)
            rejectUnauthorized: false
        }
    });
};

export const emailService = {
    /**
     * Send password reset email with token
     */
    sendPasswordResetEmail: async (to: string, resetToken: string, userName?: string): Promise<void> => {
        const resetUrl = `${process.env.HOST || 'http://localhost:3000'}/auth/password-reset?token=${resetToken}`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
    </div>
    
    <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Hi${userName ? ` ${userName}` : ''},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password for your TailorAI account. Click the button below to create a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            Or copy and paste this link into your browser:
        </p>
        
        <p style="font-size: 14px; color: #667eea; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
            ${resetUrl}
        </p>
        
        <div style="border-top: 2px solid #f0f0f0; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                <strong>⚠️ Security Note:</strong>
            </p>
            <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
            </ul>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} TailorAI. All rights reserved.</p>
    </div>
</body>
</html>
        `;

        const textContent = `
Hi${userName ? ` ${userName}` : ''},

We received a request to reset your password for your TailorAI account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

© ${new Date().getFullYear()} TailorAI
        `;

        try {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: `"TailorAI" <${process.env.SMTP_USER || 'noreply@stylorai.com'}>`,
                to,
                subject: 'Reset Your TailorAI Password',
                text: textContent,
                html: htmlContent,
            });

            console.log(`✅ Password reset email sent to: ${to}`);
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    },

    /**
     * Send password reset OTP email with 6-digit code
     */
    sendPasswordResetOTP: async (to: string, otp: string, userName?: string): Promise<void> => {
        const logoUrl = `${process.env.HOST || 'http://localhost:3000'}/logo/logo.png`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #000000; margin: 0; padding: 0; background-color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; border: 1px solid #eeeeee; }
        .header { background-color: #000000; padding: 30px; text-align: center; }
        .logo { height: 40px; } /* Removed filter so PNG renders as-is */
        .content { padding: 40px 30px; background-color: #ffffff; }
        .otp-box { 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 6px; 
            text-align: center; 
            margin: 30px 0; 
            padding: 20px; 
            background-color: #f8f8f8; 
            border: 1px solid #000000; 
            color: #000000;
        }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; }
        h2 { margin-top: 0; color: #000000; font-weight: 600; }
        p { color: #000000; }
        strong { color: #000000; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://api.stylorai.com/logo/logo.png" alt="StyloR.AI" class="logo">
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hi${userName ? ` ${userName}` : ''},</p>
            <p>You requested to reset your password. Use the code below to complete the process:</p>
            
            <div class="otp-box">${otp}</div>
            
            <p style="margin-top: 30px;"><strong>⚠️ Note:</strong> This code expires in 3 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} StyloR.AI. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        const textContent = `
Reset Your Password

Hi${userName ? ` ${userName}` : ''},

You requested to reset your password. Use the code below:

${otp}

This code expires in 3 minutes.

If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} StyloR.AI
        `;

        try {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: '"TailorAI" <noreply@stylorai.com>',
                to,
                subject: 'Reset Your Password',
                text: textContent,
                html: htmlContent,
                // Attachments removed as we are using a public URL
            });
            console.log(`✅ Password reset OTP sent to: ${to}`);
        } catch (error) {
            console.error('❌ Error sending password reset OTP:', error);
            throw new Error('Failed to send password reset OTP');
        }
    },

    /**
     * Test SMTP connection
     */
    verifyConnection: async (): Promise<boolean> => {
        try {
            const transporter = getTransporter();
            await transporter.verify();
            console.log('✅ SMTP connection verified');
            return true;
        } catch (error) {
            console.error('❌ SMTP connection failed:', error);
            return false;
        }
    }
};
