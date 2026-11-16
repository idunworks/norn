/**
 * Sends the sign-in emails. Plain text only: one link, nothing to render.
 *
 * - NORN_SMTP_URL set: Nodemailer over SMTP (smtp://user:pass@host:587, or
 *   smtps:// for port 465).
 * - NORN_MAIL_CONSOLE=true, or `pnpm dev` with no SMTP: the email is printed
 *   to the server log, for trying Norn out. Never use it on a server where
 *   anyone else can read the log: the printed link signs you in.
 * - Neither: nothing is sent and the log says why.
 */
import nodemailer from 'nodemailer';

export interface Mail {
	to: string;
	subject: string;
	text: string;
}

export interface Mailer {
	readonly kind: 'smtp' | 'console' | 'none';
	send(mail: Mail): Promise<void>;
}

export interface MailSettings {
	smtpUrl?: string;
	from?: string;
	console: boolean;
}

const DEFAULT_FROM = 'Norn <norn@localhost>';

export function createMailer(settings: MailSettings): Mailer {
	if (settings.smtpUrl) {
		const transport = nodemailer.createTransport(settings.smtpUrl);
		const from = settings.from || DEFAULT_FROM;
		return {
			kind: 'smtp',
			async send(mail) {
				await transport.sendMail({ from, ...mail });
			}
		};
	}
	if (settings.console) {
		return {
			kind: 'console',
			async send(mail) {
				console.info(`norn: email to ${mail.to} (console mailer)\nSubject: ${mail.subject}\n\n${mail.text}\n`);
			}
		};
	}
	return {
		kind: 'none',
		async send() {
			console.error('norn: a sign-in email was not sent: set NORN_SMTP_URL (see docs/self-hosting.md).');
		}
	};
}

/** "anna@example.com" becomes "a***@example.com": enough to tell two apart in a log. */
export function maskEmail(email: string): string {
	const at = email.lastIndexOf('@');
	return at < 1 ? '***' : `${email[0]}***${email.slice(at)}`;
}
