import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/nodemailer";

type NotificationType =
  | "ORDER_STATUS"
  | "PAYMENT_RECEIVED"
  | "LOW_STOCK"
  | "SYSTEM_ALERT"
  | "SHIPMENT_UPDATE";

// type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

interface SendNotificationParams {
  userId: string;
  merchantId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
}

export async function sendNotification(params: SendNotificationParams) {
  const { userId, merchantId, type, title, message, data, actionUrl } = params;

  try {
    // Get user preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId,
        notificationType: type,
        enabled: true,
      },
    });

    const enabledChannels = preferences.map((p: any) => p.channel);

    // Always create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        merchantId,
        type,
        title,
        message,
        data,
        actionUrl,
      },
    });

    // Send via enabled channels
    if (enabledChannels.includes("EMAIL")) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (user) {
        await sendMail({
          to: user.email,
          subject: title,
          html: `
            <h2>${title}</h2>
            <p>${message}</p>
            ${actionUrl ? `<p><a href="${actionUrl}">View Details</a></p>` : ""}
          `,
        });

        // Log email
        await prisma.emailLog.create({
          data: {
            merchantId,
            toEmail: user.email,
            fromEmail: process.env.SMTP_USER!,
            subject: title,
            status: "SENT",
            sentAt: new Date(),
          },
        });
      }
    }

    // SMS and PUSH would be implemented here with respective services
    // if (enabledChannels.includes("SMS")) { ... }
    // if (enabledChannels.includes("PUSH")) { ... }

    return notification;
  } catch (error) {
    console.error("Send notification error:", error);
    throw error;
  }
}
