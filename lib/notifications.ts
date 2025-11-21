import { generateMerchantWelcomeEmail, generateEmailVerificationEmail, generatePasswordResetEmail } from "./email-templates";
import prisma from "./prisma";
import { sendEmail } from "./email";
import type { AuditLogModel } from "../app/generated/prisma/models/AuditLog";
import type { NotificationModel } from "../app/generated/prisma/models/Notification";

/**
 * Creates an in-app notification record and sends an email if the user has enabled email notifications.
 * This is the central function for sensitive action alerts.
 * @param userId The ID of the recipient user.
 * @param message The in-app message text (e.g., "Order #123 was dispatched").
 * @param emailTemplateName A key for the email template function to use.
 * @param emailData The data required to render the email template.
 */
export async function createNotification(
  userId: string,
  message: string,
  linkUrl: string | null,
  emailTemplateName: "MERCHANT_WELCOME" | "ORDER_DISPATCHED" | "INVOICE_ISSUED" | "EMAIL_VERIFICATION" | "PASSWORD_RESET",
  emailData: any // Data needed for the template function
): Promise<NotificationModel> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(
      `Attempted to create notification for non-existent user: ${userId}`
    );
    // Still create the in-app notification if possible, but skip email.
  }

  // 1. Create In-App Notification Record
  const notification = await prisma.notification.create({
    data: {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      userId,
      title: 'SJFulfillment Notification',
      message,
      linkUrl,
      sendEmail: true,
      updatedAt: new Date(), // Default to true for email notifications
    },
  });

  // 2. Conditionally Send Email (always send if user exists)
  if (user) {
    let subject = "SJFulfillment Notification";
    let htmlContent = "";

    // Generate HTML based on template type
    switch (emailTemplateName) {
      case "MERCHANT_WELCOME":
        subject = `Welcome to SJFulfillment, ${emailData.businessName}!`;
        htmlContent = generateMerchantWelcomeEmail(emailData);
        break;
      case "EMAIL_VERIFICATION":
        subject = `Verify Your Email - SJFulfillment`;
        htmlContent = generateEmailVerificationEmail(emailData);
        break;
      case "PASSWORD_RESET":
        subject = `Reset Your Password - SJFulfillment`;
        htmlContent = generatePasswordResetEmail(emailData);
        break;
      // Add other cases here (e.g., ORDER_DISPATCHED, INVOICE_ISSUED)
      default:
        console.warn(
          `Unknown email template: ${emailTemplateName}. Sending generic notification.`
        );
        subject = `Action Required: ${message}`;
        htmlContent = `<p>${message}</p><p>View details in your dashboard: ${linkUrl}</p>`;
        break;
    }

    try {
      await sendEmail({ to: user.email, subject, html: htmlContent });
      console.log(
        `Email sent for notification ${notification.id} to ${user.email}`
      );
    } catch (error) {
      // Non-critical failure: log the error but don't stop the main transaction
      console.error(
        `Failed to send email for notification ${notification.id}:`,
        error
      );
      
      // Log email details for manual retry
      console.log('EMAIL QUEUED FOR RETRY:', {
        notificationId: notification.id,
        to: user.email,
        subject,
        htmlContent: htmlContent.substring(0, 200) + '...', // Truncated for logs
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  return notification;
}

/**
 * Utility to log critical actions to the AuditLog model.
 * @param userId The ID of the user who performed the action (Admin, Merchant, etc.).
 * @param entityType The model name affected (e.g., 'Order', 'Business').
 * @param entityId The ID of the specific record affected.
 * @param action A short, descriptive action key (e.g., 'MERCHANT_CREATED', 'STOCK_ADJUSTMENT').
 * @param details JSON object containing before/after state or relevant context.
 */
export async function createAuditLog(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  details: any | null = null
): Promise<AuditLogModel> {
  return prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      changedById: userId,
      entityType,
      entityId,
      action,
      details: details ? JSON.stringify(details) : undefined
    },
  });
}

// Utility to send a notification to a merchant by merchantId
export async function sendNotificationToMerchant(
  merchantId: string,
  { title, message, linkUrl }: { title: string; message: string; linkUrl?: string }
) {
  // Find the merchant's user (owner)
  const business = await prisma.business.findUnique({
    where: { id: merchantId },
    select: { ownerId: true }
  });
  if (!business?.ownerId) return;
  await createNotification(
    business.ownerId,
    message,
    linkUrl || null,
    "ORDER_DISPATCHED",
    { message, linkUrl, title }
  );
}
