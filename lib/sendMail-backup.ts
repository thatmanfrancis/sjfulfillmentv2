import axios from "axios";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

// Send using ZeptoMail HTTP API
async function sendViaZeptoMail({
  to,
  subject,
  html,
  from,
}: SendEmailParams & { from: string }) {
  // It's assumed these are loaded from .env/process.env
  const apiKey = process.env.ZEPTO_API_KEY?.trim();
  const apiUrl =
    process.env.ZEPTOMAIL_API_URL!;

  if (!apiKey) {
    throw new Error("ZeptoMail API key not set (ZEPTO_API_KEY)");
  }

  // Use the email specified in the 'from' field, falling back to a default if parsing fails
  let fromEmail = from;
  let fromName = "SJFulfillment";
  const fromMatch = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (fromMatch) {
    fromName = fromMatch[1].trim();
    fromEmail = fromMatch[2].trim();
  }

  // ZeptoMail API v1.1 requires this exact structure
  const recipients = Array.isArray(to) ? to : [to];
  const payload = {
    from: {
      address: fromEmail,
      name: fromName,
    },
    to: recipients.map((email) => ({
      email_address: {
        address: email,
        name: email.split("@")[0], // simple fallback name
      },
    })),
    subject,
    htmlbody: html,
  };

  try {
    console.log("Sending email via ZeptoMail...", {
      to: recipients,
      subject,
      from: fromEmail,
      fromName,
      apiUrl,
      apiKeyPrefix: apiKey.substring(0, 5) + "...", // Log prefix for debugging
    });

    const res = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: apiKey, // ZeptoMail uses the key directly, not "Bearer"
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    console.log("✅ ZeptoMail response status:", res.status);
    console.log("✅ Email sent successfully");
    return res.data;
  } catch (err: any) {
    console.error("❌ Error sending email via ZeptoMail:", {
      status: err?.response?.status,
      statusText: err?.response?.statusText,
      data: err?.response?.data,
      message: err?.message,
      code: err?.code,
    });

    // Re-throw to allow caller to handle failure
    throw new Error("Failed to send email via ZeptoMail API.");
  }
}

/**
 * Public function to send an email using the configured provider (ZeptoMail).
 * @param to Recipient email address(es).
 * @param subject Email subject line.
 * @param html HTML body content.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> {
  const from =
    process.env.EMAIL_FROM || "SJFulfillment <no-reply@sjfulfillment.com>";

  await sendViaZeptoMail({ to, subject, html, from });
}
