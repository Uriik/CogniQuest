/**
 * Transactional e-mail via SMTP (nodemailer). Used for 2FA OTP codes and
 * verification links. Credentials come from env (Secret Manager in prod):
 *
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587            # 587 = STARTTLS (default) | 465 = SSL
 *   SMTP_SECURE=false        # true only for port 465
 *   SMTP_USER=...            # full e-mail
 *   SMTP_PASS=...            # Gmail app password (16 chars, no spaces)
 *   SMTP_FROM="CogniQuest <no-reply@...>"
 */
import nodemailer, { type Transporter } from "nodemailer";

export interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getMailerConfig(): MailerConfig {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = (process.env.SMTP_SECURE ?? "false") === "true" || port === 465;
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const from = process.env.SMTP_FROM ?? user;
  if (!user || !pass) throw new Error("SMTP_USER / SMTP_PASS not configured");
  return { host, port, secure, user, pass, from };
}

let _transporter: Transporter | null = null;

export function getTransporter(cfg = getMailerConfig()): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure, // false for 587 (STARTTLS), true for 465 (SSL)
      requireTLS: !cfg.secure, // enforce STARTTLS on 587
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return _transporter;
}

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  const cfg = getMailerConfig();
  await getTransporter(cfg).sendMail({
    from: cfg.from,
    to,
    subject,
    text: text ?? html.replace(/<[^>]+>/g, " "),
    html,
  });
}

/** Send the password recovery code. */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = "Recuperação de Senha — CogniQuest";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#00BFA6">CogniQuest — Recuperação de Senha</h2>
      <p>Você solicitou a redefinição de senha. Use o código abaixo para continuar. Ele expira em 5 minutos.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;
                background:#0b1120;color:#00F0FF;padding:16px;border-radius:12px">
        ${code}
      </p>
      <p style="color:#64748b;font-size:13px">
        Se você não solicitou, ignore este e-mail.
      </p>
    </div>`;
  await sendMail(to, subject, html, `Seu código de recuperação: ${code} (expira em 5 min)`);
}

/** Send the welcome email after registration. */
export async function sendWelcomeEmail(to: string, displayName: string): Promise<void> {
  const subject = "Bem-vindo à Arena — CogniQuest";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#00BFA6">Olá, ${displayName}! Bem-vindo ao CogniQuest!</h2>
      <p>Sua conta foi criada com sucesso.</p>
      <p>Você já pode acessar a plataforma, entrar em salas e começar a testar seus conhecimentos nas batalhas.</p>
      <p style="text-align:center; margin-top: 30px;">
        <a href="http://localhost:3000/login" style="background:#00F0FF;color:#05070F;padding:12px 24px;
              border-radius:8px;text-decoration:none;font-weight:700">Entrar na Arena</a>
      </p>
      <p style="color:#64748b;font-size:13px; margin-top: 30px;">
        Equipe CogniQuest
      </p>
    </div>`;
  await sendMail(to, subject, html, `Olá, ${displayName}! Bem-vindo ao CogniQuest. Sua conta foi criada com sucesso!`);
}

/** Send the e-mail verification link (account activation). */
export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  const subject = "Confirme seu e-mail — CogniQuest";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#00BFA6">Bem-vindo ao CogniQuest!</h2>
      <p>Confirme seu e-mail para ativar a conta:</p>
      <p><a href="${link}" style="background:#00F0FF;color:#05070F;padding:12px 20px;
            border-radius:8px;text-decoration:none;font-weight:700">Confirmar e-mail</a></p>
      <p style="color:#64748b;font-size:13px">${link}</p>
    </div>`;
  await sendMail(to, subject, html, `Confirme seu e-mail: ${link}`);
}
