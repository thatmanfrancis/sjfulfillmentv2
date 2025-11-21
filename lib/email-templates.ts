interface MerchantWelcomeEmailParams {
  businessName: string;
  email: string;
  password: string; // Temporary password for first login
  loginUrl: string;
}

interface EmailVerificationParams {
  firstName: string;
  businessName: string;
  verificationUrl: string;
  supportEmail: string;
  temporaryPassword?: string; // Optional temporary password for merchant accounts
  email?: string; // Optional email for merchant accounts
}

interface PasswordResetParams {
  firstName: string;
  businessName: string;
  resetUrl: string;
  supportEmail: string;
  expiryMinutes: number;
}

/**
 * Generates the HTML for the Merchant Welcome and Onboarding email.
 */
export function generateMerchantWelcomeEmail({
  businessName,
  email,
  password,
  loginUrl,
}: MerchantWelcomeEmailParams): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SJFulfillment!</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Welcome to SJFulfillment!</h1>
            </div>

            <!-- Body Content -->
            <div style="padding: 30px;">
                <h2 style="color: #333333; font-size: 20px; margin-top: 0;">Hello ${businessName} Team,</h2>
                
                <p style="color: #555555; line-height: 1.6;">
                    Your account has been successfully set up by our Admin team. You are now ready to begin the final phase of onboarding and manage your fulfillment operations.
                </p>

                <p style="color: #333333; font-weight: bold; margin: 20px 0;">
                    Please use the temporary credentials below to log in:
                </p>

                <div style="background-color: #f9f9f9; border: 1px solid #eeeeee; padding: 15px; border-radius: 4px; text-align: center;">
                    <p style="margin: 5px 0; font-size: 16px;">
                        <strong>Email:</strong> <span style="color: #007bff;">${email}</span>
                    </p>
                    <p style="margin: 5px 0; font-size: 16px;">
                        <strong>Temporary Password:</strong> <span style="color: #dc3545; font-weight: bold;">${password}</span>
                    </p>
                </div>

                <p style="color: #555555; line-height: 1.6; margin-top: 25px;">
                    Click the button below to access your dashboard. You will be prompted to change your password and complete your security setup immediately after your first login.
                </p>
                
                <!-- Login Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 12px 25px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        Go to Dashboard
                    </a>
                </div>

                <p style="color: #555555; line-height: 1.6;">
                    If you have any questions during your onboarding process, please contact your dedicated account manager.
                </p>

                <p style="color: #555555; line-height: 1.6; margin-top: 30px;">
                    Best regards,<br>
                    The SJFulfillment Team
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #eeeeee; color: #777777; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                &copy; ${new Date().getFullYear()} SJFulfillment. All rights reserved.
            </div>

        </div>
    </body>
    </html>
    `;
}

/**
 * Generates the HTML for the Email Verification email.
 */
export function generateEmailVerificationEmail({
  firstName,
  businessName,
  verificationUrl,
  supportEmail,
  temporaryPassword,
  email,
}: EmailVerificationParams): string {
  const isMerchantAccount = !!(temporaryPassword && email);
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - SJFulfillment</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">${isMerchantAccount ? 'Welcome to SJFulfillment!' : 'Verify Your Email'}</h1>
            </div>

            <!-- Body Content -->
            <div style="padding: 30px;">
                <h2 style="color: #333333; font-size: 20px; margin-top: 0;">Hello ${firstName},</h2>
                
                ${isMerchantAccount ? `
                <p style="color: #555555; line-height: 1.6;">
                    Your merchant account for <strong>${businessName}</strong> has been created! Please verify your email address to complete the setup and activate your account.
                </p>

                <!-- Account Details Box -->
                <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 25px 0; border-radius: 4px;">
                    <h3 style="color: #333; margin-top: 0; font-size: 16px;">Your Account Details:</h3>
                    <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 3px; color: #495057;">${temporaryPassword}</code></p>
                    <p style="color: #777; font-size: 13px; margin-top: 15px; margin-bottom: 0;">
                        ⚠️ Please change your password after your first login for security.
                    </p>
                </div>
                ` : `
                <p style="color: #555555; line-height: 1.6;">
                    Thank you for registering <strong>${businessName}</strong> with SJFulfillment! To complete your registration and secure your account, please verify your email address.
                </p>
                `}

                <p style="color: #555555; line-height: 1.6;">
                    Click the button below to verify your email address:
                </p>
                
                <!-- Verification Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 15px 30px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        Verify Email Address
                    </a>
                </div>

                <p style="color: #777777; line-height: 1.6; font-size: 14px;">
                    If the button above doesn't work, copy and paste this link into your browser:
                    <br>
                    <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
                </p>

                <p style="color: #555555; line-height: 1.6; margin-top: 25px;">
                    This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
                </p>

                <p style="color: #555555; line-height: 1.6;">
                    ${isMerchantAccount ? 'Once verified, your merchant account will be reviewed by our team and you\'ll be notified when it\'s approved for use.' : 'Once verified, your account will be reviewed by our team and you\'ll be notified when it\'s approved.'}
                </p>

                <p style="color: #555555; line-height: 1.6; margin-top: 30px;">
                    If you have any questions, please contact us at <a href="mailto:${supportEmail}" style="color: #007bff;">${supportEmail}</a>
                </p>

                <p style="color: #555555; line-height: 1.6; margin-top: 30px;">
                    Best regards,<br>
                    The SJFulfillment Team
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #eeeeee; color: #777777; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                &copy; ${new Date().getFullYear()} SJFulfillment. All rights reserved.
            </div>

        </div>
    </body>
    </html>
    `;
}

/**
 * Generates the HTML for the Password Reset email.
 */
export function generatePasswordResetEmail({
  firstName,
  businessName,
  resetUrl,
  supportEmail,
  expiryMinutes,
}: PasswordResetParams): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - SJFulfillment</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #dc3545; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
            </div>

            <!-- Body Content -->
            <div style="padding: 30px;">
                <h2 style="color: #333333; font-size: 20px; margin-top: 0;">Hello ${firstName},</h2>
                
                <p style="color: #555555; line-height: 1.6;">
                    We received a request to reset the password for your <strong>${businessName}</strong> account on SJFulfillment.
                </p>

                <p style="color: #555555; line-height: 1.6;">
                    If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                </p>

                <p style="color: #555555; line-height: 1.6;">
                    To reset your password, click the button below:
                </p>
                
                <!-- Reset Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                        Reset Password
                    </a>
                </div>

                <p style="color: #777777; line-height: 1.6; font-size: 14px;">
                    If the button above doesn't work, copy and paste this link into your browser:
                    <br>
                    <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
                </p>

                <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 25px 0;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>⚠️ Important:</strong> This password reset link will expire in ${expiryMinutes} minutes for security reasons.
                    </p>
                </div>

                <p style="color: #555555; line-height: 1.6; margin-top: 30px;">
                    If you have any questions or didn't request this reset, please contact our support team at <a href="mailto:${supportEmail}" style="color: #007bff;">${supportEmail}</a>
                </p>

                <p style="color: #555555; line-height: 1.6; margin-top: 30px;">
                    Best regards,<br>
                    The SJFulfillment Security Team
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #eeeeee; color: #777777; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                &copy; ${new Date().getFullYear()} SJFulfillment. All rights reserved.
            </div>

        </div>
    </body>
    </html>
    `;
}
