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

/**
 * Two ways to send, picked by environment variables:
 *  - SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS, optional SMTP_PORT): works with a Gmail
 *    account and an app password, or any other mail server.
 *  - Resend (RESEND_API_KEY): needs a domain verified with Resend.
 * In development with neither, emails are printed to the terminal instead.
 */
export function emailConfigured() {
  return Boolean(smtpSettings() || process.env.RESEND_API_KEY);
}

function smtpSettings() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return { host, port, secure: port === 465, auth: { user, pass } };
}

function fromAddress() {
  return process.env.EMAIL_FROM || (process.env.SMTP_USER ? `NotifyHub <${process.env.SMTP_USER}>` : "NotifyHub <verify@notifyhub.in>");
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean; devLogged?: boolean }> {
  const smtp = smtpSettings();
  if (smtp) {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({ ...smtp, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 });
    try {
      await transport.sendMail({ from: fromAddress(), to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    } catch (err) {
      console.error("SMTP error", err);
      throw new Error("Email could not be sent");
    }
    return { delivered: true };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new EmailNotConfiguredError("Email is not configured (set SMTP_* or RESEND_API_KEY)");
    }
    console.info(`\n[NotifyHub dev email] to=${msg.to}\nsubject: ${msg.subject}\n${msg.text}\n`);
    return { delivered: false, devLogged: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress(), to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("Email provider error", res.status, await res.text().catch(() => ""));
    throw new Error("Email could not be sent");
  }
  return { delivered: true };
}

/** Emails that carry a one-time sign-in link: confirm address, invitation, password reset. */
export function linkEmail(kind: "signup" | "invite" | "recovery", url: string, ctx: { collegeName?: string; role?: string } = {}) {
  const college = ctx.collegeName ? escapeHtml(ctx.collegeName) : "NotifyHub";
  const copy = {
    signup: {
      subject: "Confirm your NotifyHub account",
      lead: `Confirm this email address to finish setting up the admin account for ${college}.`,
      button: "Confirm email address",
    },
    invite: {
      subject: `You have been added to ${ctx.collegeName ?? "a college"} on NotifyHub`,
      lead: `You have been added as ${escapeHtml(ctx.role ?? "an admin")} for ${college} on NotifyHub, where the college posts its official notices and events. Choose a password to start.`,
      button: "Choose your password",
    },
    recovery: {
      subject: "Reset your NotifyHub password",
      lead: "Someone asked to reset the password for this NotifyHub account. If it was you, choose a new password.",
      button: "Choose a new password",
    },
  }[kind];
  const note = "The link works once and expires in 24 hours. If you did not expect this email, you can ignore it.";
  const lead = copy.lead.replace(/<[^>]+>/g, "");
  const text = `${lead.replace(/&amp;/g, "&").replace(/&#39;/g, "'")}\n\n${copy.button}: ${url}\n\n${note}`;
  const html =
    `<div style="font-family:system-ui,sans-serif;color:#12233a;max-width:480px;line-height:1.5">` +
    `<p>${copy.lead}</p>` +
    `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#1f4e8c;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700">${copy.button}</a></p>` +
    `<p style="color:#62728a;font-size:14px">${note}</p>` +
    `<p style="color:#62728a;font-size:12px;word-break:break-all">If the button does not work, open this address: ${escapeHtml(url)}</p></div>`;
  return { subject: copy.subject, text, html };
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
