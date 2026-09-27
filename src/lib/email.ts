import "server-only";

/**
 * Transactional email. One small interface so other channels
 * (WhatsApp, push) can sit beside it later in lib/notifications.
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailNotConfiguredError extends Error {}

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean; devLogged?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new EmailNotConfiguredError("Email is not configured (RESEND_API_KEY missing)");
    }
    console.info(`\n[NotifyHub dev email] to=${msg.to}\nsubject: ${msg.subject}\n${msg.text}\n`);
    return { delivered: false, devLogged: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "NotifyHub <verify@notifyhub.in>",
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("Email provider error", res.status, await res.text().catch(() => ""));
    throw new Error("Email could not be sent");
  }
  return { delivered: true };
}

export function otpEmail(code: string, collegeName: string) {
  const text =
    `Your NotifyHub verification code is ${code}\n\n` +
    `Someone is connecting ${collegeName} to NotifyHub and entered this address to confirm the college's ownership. ` +
    `The code expires in 10 minutes.\n\nIf you did not request this, you can ignore this email; nothing will be created without the code.`;
  const html =
    `<div style="font-family:system-ui,sans-serif;color:#12233a;max-width:480px">` +
    `<p>Your NotifyHub verification code is</p>` +
    `<p style="font-size:28px;font-weight:800;letter-spacing:6px;margin:8px 0 16px">${code}</p>` +
    `<p>Someone is connecting <strong>${escapeHtml(collegeName)}</strong> to NotifyHub and entered this address to confirm the college's ownership. The code expires in 10 minutes.</p>` +
    `<p style="color:#62728a">If you did not request this, ignore this email. Nothing will be created without the code.</p></div>`;
  return { subject: `${code} is your NotifyHub verification code`, text, html };
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
