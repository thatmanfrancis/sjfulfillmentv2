import { CurrencyService } from './currency';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface OrderStatusData {
  orderId: string;
  externalOrderId?: string;
  customerName: string;
  status: string;
  merchantName: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

export interface LowStockData {
  productName: string;
  sku: string;
  currentStock: number;
  safetyStock: number;
  warehouseName: string;
  businessName: string;
}

export interface InvoiceData {
  invoiceId: string;
  billingPeriod: string;
  totalAmount: number;
  dueDate: Date;
  merchantName: string;
  currency: string;
}

export class EmailService {
  private static readonly ZEPTO_API_URL = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";

  /**
   * Send email using ZeptoMail API
   */
  static async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.error(
          "Email service not configured - missing ZeptoMail API key"
        );
        return false;
      }

      const recipients = Array.isArray(to)
        ? to.map((email) => ({ email_address: { address: email } }))
        : [{ email_address: { address: to } }];

      // Parse EMAIL_FROM to get address and name
      const emailFrom = process.env.EMAIL_FROM || "SJFulfillment <no-reply@sjfulfillment.com>";
      const fromMatch = emailFrom.match(/^(.+?)\s*<(.+)>$/) || emailFrom.match(/^(.+)$/);
      const fromName = fromMatch && fromMatch.length > 2 ? fromMatch[1].trim() : "SJFulfillment";
      const fromAddress = fromMatch && fromMatch.length > 2 ? fromMatch[2].trim() : emailFrom;

      const emailData = {
        bounce_address: fromAddress,
        from: {
          address: fromAddress,
          name: fromName,
        },
        to: recipients,
        subject,
        htmlbody: html,
        textbody: text || this.htmlToText(html),
        track_clicks: true,
        track_opens: true,
        client_reference: `sjfulfillment-${Date.now()}`,
        mime_headers: {
          "X-Mailer": "SendJon Logistics Platform",
        },
      };

      // Handle API key format - extract just the key if it includes the prefix
      const apiKey = process.env.ZEPTOMAIL_API_KEY!;
      const authHeader = apiKey.startsWith('Zoho-enczapikey ') 
        ? apiKey // Use as-is if already formatted
        : `Zoho-enczapikey ${apiKey}`; // Add prefix if not present

      const response = await fetch(this.ZEPTO_API_URL!, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(emailData),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        // Handle potential empty response or non-JSON response
        const contentType = response.headers.get("content-type");
        let result;
        
        if (contentType && contentType.includes("application/json")) {
          try {
            result = await response.json();
            console.log(
              "Email sent successfully via ZeptoMail:",
              result?.data?.[0]?.message || result?.request_id || "Email sent"
            );
          } catch (parseError) {
            console.log("Email sent successfully via ZeptoMail (response not JSON)");
          }
        } else {
          console.log("Email sent successfully via ZeptoMail (non-JSON response)");
        }
        return true;
      } else {
        // Handle error responses more carefully
        try {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Unknown error', status: response.status };
          }
          
          console.error("ZeptoMail API error:", response.status, errorData);
          return false;
        } catch (error) {
          console.error("ZeptoMail API error (failed to parse):", response.status, error);
          return false;
        }
      }
    } catch (error: any) {
      // Handle different types of network errors
      if (error.name === 'AbortError') {
        console.error("Email sending timeout - ZeptoMail API took too long to respond");
      } else if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND') {
        console.error("DNS resolution failed - unable to reach ZeptoMail API:", error.message);
        console.log("This might be a temporary network issue. Email will be attempted again later.");
      } else if (error.code === 'ECONNREFUSED') {
        console.error("Connection refused - ZeptoMail API is not accessible:", error.message);
      } else {
        console.error("Error sending email via ZeptoMail:", error);
      }
      return false;
    }
  }

  /**
   * Send order status update notification
   */
  static async sendOrderStatusUpdate(
    email: string,
    data: OrderStatusData
  ): Promise<boolean> {
    const template = this.generateOrderStatusTemplate(data);
    return this.sendEmail(
      email,
      template.subject,
      template.html,
      template.text
    );
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(
    emails: string[],
    data: LowStockData
  ): Promise<boolean> {
    const template = this.generateLowStockTemplate(data);
    return this.sendEmail(
      emails,
      template.subject,
      template.html,
      template.text
    );
  }

  /**
   * Send invoice notification
   */
  static async sendInvoiceNotification(
    email: string,
    data: InvoiceData
  ): Promise<boolean> {
    const template = await this.generateInvoiceTemplate(data);
    return this.sendEmail(
      email,
      template.subject,
      template.html,
      template.text
    );
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(
    email: string,
    firstName: string,
    role: string,
    tempPassword?: string
  ): Promise<boolean> {
    const template = this.generateWelcomeTemplate(
      firstName,
      role,
      tempPassword
    );
    return this.sendEmail(
      email,
      template.subject,
      template.html,
      template.text
    );
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    const template = this.generatePasswordResetTemplate(firstName, resetToken);
    return this.sendEmail(
      email,
      template.subject,
      template.html,
      template.text
    );
  }

  /**
   * Generate order status update template
   */
  private static generateOrderStatusTemplate(
    data: OrderStatusData
  ): EmailTemplate {
    const statusMessages = {
      NEW: "Your order has been received and is being processed.",
      AWAITING_ALLOC: "Your order is being prepared for fulfillment.",
      DISPATCHED: "Your order has been dispatched from our warehouse.",
      PICKED_UP: "Your order has been picked up by our delivery partner.",
      DELIVERING: "Your order is out for delivery.",
      DELIVERED: "Your order has been successfully delivered.",
      RETURNED: "Your order has been returned.",
      CANCELED: "Your order has been canceled.",
      ON_HOLD: "Your order is currently on hold.",
    };

    const message =
      statusMessages[data.status as keyof typeof statusMessages] ||
      "Your order status has been updated.";

    const subject = `Order Update: ${data.externalOrderId || data.orderId} - ${
      data.status
    }`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .status { font-weight: bold; font-size: 18px; color: #2c5aa0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            
            <div class="order-info">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${
                data.externalOrderId || data.orderId
              }</p>
              <p><strong>Status:</strong> <span class="status">${
                data.status
              }</span></p>
              <p><strong>Merchant:</strong> ${data.merchantName}</p>
              ${
                data.trackingNumber
                  ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>`
                  : ""
              }
              ${
                data.estimatedDelivery
                  ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery.toDateString()}</p>`
                  : ""
              }
            </div>
            
            <p>${message}</p>
            
            ${
              data.status === "DELIVERING" || data.status === "DISPATCHED"
                ? "<p>Please ensure someone is available to receive the delivery.</p>"
                : ""
            }
            
            <p>If you have any questions about your order, please contact ${
              data.merchantName
            } directly.</p>
            
            <p>Thank you for choosing SendJon Logistics!</p>
          </div>
          <div class="footer">
            <p>SendJon Logistics - Reliable Third-Party Logistics Services</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Generate low stock alert template
   */
  private static generateLowStockTemplate(data: LowStockData): EmailTemplate {
    const subject = `Low Stock Alert: ${data.productName} (${data.sku})`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .alert { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .stock-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .urgent { color: #d63384; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
          </div>
          <div class="content">
            <div class="alert">
              <p class="urgent">ATTENTION: Stock levels are running low for one of your products.</p>
            </div>
            
            <div class="stock-info">
              <h3>Product Information</h3>
              <p><strong>Product:</strong> ${data.productName}</p>
              <p><strong>SKU:</strong> ${data.sku}</p>
              <p><strong>Business:</strong> ${data.businessName}</p>
              <p><strong>Warehouse:</strong> ${data.warehouseName}</p>
              <p><strong>Current Stock:</strong> <span class="urgent">${data.currentStock} units</span></p>
              <p><strong>Safety Stock Level:</strong> ${data.safetyStock} units</p>
            </div>
            
            <p>Your product stock has fallen below the safety stock level. Consider restocking soon to avoid stockouts.</p>
            
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Review your inventory replenishment schedule</li>
              <li>Contact your suppliers to arrange new stock deliveries</li>
              <li>Consider adjusting safety stock levels if needed</li>
              <li>Update your product availability on sales channels if necessary</li>
            </ul>
            
            <p>Log into your SendJon dashboard to view detailed inventory reports and take action.</p>
          </div>
          <div class="footer">
            <p>SendJon Logistics - Smart Inventory Management</p>
            <p>This is an automated alert. Manage your notification preferences in your dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Generate invoice template
   */
  private static async generateInvoiceTemplate(
    data: InvoiceData
  ): Promise<EmailTemplate> {
    const subject = `Invoice ${data.billingPeriod} - ${data.merchantName}`;

    let formattedAmount;
    try {
      formattedAmount = CurrencyService.formatCurrency(
        data.totalAmount,
        data.currency
      );
    } catch (error) {
      formattedAmount = `${data.currency} ${data.totalAmount.toFixed(2)}`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .invoice-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .amount { font-weight: bold; font-size: 20px; color: #2c5aa0; }
          .due-date { color: #d63384; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 New Invoice Available</h1>
          </div>
          <div class="content">
            <p>Dear ${data.merchantName},</p>
            
            <p>Your invoice for ${data.billingPeriod} is now available.</p>
            
            <div class="invoice-info">
              <h3>Invoice Summary</h3>
              <p><strong>Invoice ID:</strong> ${data.invoiceId}</p>
              <p><strong>Billing Period:</strong> ${data.billingPeriod}</p>
              <p><strong>Total Amount:</strong> <span class="amount">${formattedAmount}</span></p>
              <p><strong>Due Date:</strong> <span class="due-date">${data.dueDate.toDateString()}</span></p>
            </div>
            
            <p>This invoice includes charges for:</p>
            <ul>
              <li>Storage fees for your inventory</li>
              <li>Order fulfillment and picking fees</li>
              <li>Receiving and processing fees</li>
              <li>Any additional services utilized</li>
            </ul>
            
            <p>You can download the detailed PDF invoice from your dashboard or by clicking the link below:</p>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/invoices/${
      data.invoiceId
    }" style="background-color: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Invoice</a></p>
            
            <p><strong>Payment Instructions:</strong><br>
            Please ensure payment is made by the due date to avoid late fees. Contact our billing team if you have any questions about this invoice.</p>
          </div>
          <div class="footer">
            <p>SendJon Logistics - Professional 3PL Services</p>
            <p>Questions? Contact us at billing@sendjon.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Generate welcome email template
   */
  private static generateWelcomeTemplate(
    firstName: string,
    role: string,
    tempPassword?: string
  ): EmailTemplate {
    const subject = `Welcome to SendJon Logistics Platform!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SendJon</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .welcome-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .password { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .button { background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SendJon!</h1>
          </div>
          <div class="content">
            <p>Dear ${firstName},</p>
            
            <p>Welcome to the SendJon Logistics platform! Your account has been created successfully.</p>
            
            <div class="welcome-info">
              <h3>Account Details</h3>
              <p><strong>Role:</strong> ${role}</p>
              <p><strong>Platform Access:</strong> Full logistics management dashboard</p>
            </div>
            
            ${
              tempPassword
                ? `
            <div class="password">
              <p><strong>⚠️ Temporary Password:</strong></p>
              <p style="font-family: monospace; font-size: 16px; font-weight: bold;">${tempPassword}</p>
              <p><em>Please change this password after your first login for security purposes.</em></p>
            </div>
            `
                : ""
            }
            
            <p><strong>What you can do with your account:</strong></p>
            <ul>
              <li>Manage inventory and stock levels</li>
              <li>Track order fulfillment in real-time</li>
              <li>Generate reports and analytics</li>
              <li>Coordinate with logistics team</li>
              <li>Monitor billing and invoicing</li>
            </ul>
            
            <p>Get started by logging into your dashboard:</p>
            <a href="${
              process.env.FRONTEND_URL
            }/login" class="button">Access Dashboard</a>
            
            <p>If you need any assistance, our support team is here to help!</p>
          </div>
          <div class="footer">
            <p>SendJon Logistics - Your Trusted 3PL Partner</p>
            <p>Need help? Contact us at support@sendjon.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Generate password reset template
   */
  private static generatePasswordResetTemplate(
    firstName: string,
    resetToken: string
  ): EmailTemplate {
    const subject = `Password Reset - SendJon Logistics`;
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .reset-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .button { background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .warning { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 5px; color: #721c24; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Dear ${firstName},</p>
            
            <p>We received a request to reset your password for your SendJon Logistics account.</p>
            
            <div class="reset-info">
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${resetUrl}</p>
            </div>
            
            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <p>This password reset link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this password reset, please ignore this email or contact support immediately.</p>
            </div>
          </div>
          <div class="footer">
            <p>SendJon Logistics Security Team</p>
            <p>Questions? Contact us at security@sendjon.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Check if email service is configured
   */
  static isConfigured(): boolean {
    return !!(process.env.ZEPTOMAIL_API_KEY && process.env.EMAIL_FROM);
  }

  /**
   * Test email configuration
   */
  static async testConfiguration(): Promise<boolean> {
    try {
      // Test ZeptoMail configuration by checking API key format
      const apiKey = process.env.ZEPTOMAIL_API_KEY;
      const fromEmail = process.env.EMAIL_FROM;

      if (!apiKey || !fromEmail) {
        console.error("ZeptoMail configuration missing: API_KEY or EMAIL_FROM");
        return false;
      }

      // Basic validation - check if API key exists and has reasonable length
      if (apiKey.length < 10) {
        console.error("ZeptoMail API key appears too short or invalid");
        return false;
      }

      console.log("ZeptoMail configuration appears valid");
      return true;
    } catch (error) {
      console.error("ZeptoMail configuration test failed:", error);
      return false;
    }
  }
}

export default EmailService;