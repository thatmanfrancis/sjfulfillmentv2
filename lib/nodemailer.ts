// Legacy module name retained for compatibility.
// The project now uses `lib/email.ts` (ZeptoMail). To avoid changing many
// call-sites across the codebase we provide a thin wrapper that re-exports
// the modern `sendEmail` function under the historical `sendMail` name.

import { sendEmail } from "./email";

export async function sendMail({ to, subject, html }: { to: string | string[]; subject: string; html: string }) {
  // keep shape similar to the old sendMail and return the underlying result
  return await sendEmail({ to, subject, html });
}

export default sendMail;