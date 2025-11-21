import axios from "axios";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

// Nodemailer/SMTP removed — using ZeptoMail HTTP API exclusively.

// Send using ZeptoMail HTTP API
async function sendViaZeptoMail({
  to,
  subject,
  html,
  from,
}: SendEmailParams & { from: string }) {
  const apiKey = process.env.ZEPTOMAIL_API_KEY?.trim();
  const apiUrl =
    process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";

  if (!apiKey) {
    throw new Error("ZeptoMail API key not set (ZEPTOMAIL_API_KEY)");
  }

  // Parse the from field: "Name <email@domain.com>" or just "email@domain.com"
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
      apiKeyPrefix: apiKey.substring(0, 20) + "...", // Log prefix for debugging
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

    // Provide helpful error messages
    if (err?.response?.status === 401) {
      console.error(
        "ZeptoMail 401: Check your ZEPTOMAIL_API_KEY is correct and active"
      );
    } else if (err?.response?.status === 403) {
      console.error(
        "ZeptoMail 403: Check your sender domain is verified in ZeptoMail console"
      );
    } else if (err?.code === "ECONNREFUSED") {
      console.error("Connection refused: Unable to reach ZeptoMail API");
    } else if (err?.code === "ETIMEDOUT") {
      console.error(
        "Connection timeout: ZeptoMail API did not respond in time"
      );
    }

    throw err;
  }
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> {
  // Log environment variables for debugging
  console.log("📧 sendEmail called with environment check:", {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ZEPTOMAIL_API_KEY_SET: !!process.env.ZEPTOMAIL_API_KEY,
    ZEPTOMAIL_API_KEY_LENGTH: process.env.ZEPTOMAIL_API_KEY?.length,
    to,
    subject,
  });

  const from =
    process.env.EMAIL_FROM || "SJFulfillment <no-reply@sjfulfillment.com>";
  // Use ZeptoMail exclusively
  await sendViaZeptoMail({ to, subject, html, from });
}