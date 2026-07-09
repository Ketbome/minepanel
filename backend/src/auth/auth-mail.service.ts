import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { InstanceSettingsService } from '../settings/instance-settings.service';

@Injectable()
export class AuthMailService {
  private transporter: Transporter | null = null;

  constructor(private readonly instanceSettings: InstanceSettingsService) {
    // Drop the cached transporter when SMTP settings change so the next email
    // uses the new configuration without a restart.
    this.instanceSettings.registerResetHandler(() => {
      this.transporter = null;
    });
  }

  async isConfigured(): Promise<boolean> {
    const smtp = await this.instanceSettings.getSmtp();
    return smtp.enabled;
  }

  async sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
    const smtp = await this.requireSmtp('Password recovery is not configured');
    const html = this.buildPasswordResetHtml(username, resetUrl);

    await this.getTransporter().sendMail({
      from: smtp.from,
      to,
      subject: 'Minepanel | Password reset',
      text: [
        `Hello ${username},`,
        '',
        'A request was made to reset your Minepanel password.',
        `Open this link to choose a new password: ${resetUrl}`,
        '',
        'If you did not request this change, you can ignore this email.',
      ].join('\n'),
      html,
    });
  }

  async sendUserInvitationEmail(to: string, inviteUrl: string): Promise<void> {
    const smtp = await this.requireSmtp('Email delivery is not configured');

    await this.getTransporter().sendMail({
      from: smtp.from,
      to,
      subject: 'Minepanel | User invitation',
      text: [
        'You have been invited to join Minepanel.',
        '',
        `Open this link to create your account: ${inviteUrl}`,
      ].join('\n'),
      html: this.buildUserInvitationHtml(inviteUrl),
    });
  }

  async sendEmailChangeCodeEmail(to: string, username: string, code: string): Promise<void> {
    const smtp = await this.requireSmtp('Email delivery is not configured');

    await this.getTransporter().sendMail({
      from: smtp.from,
      to,
      subject: 'Minepanel | Email change confirmation',
      text: [
        `Hello ${username},`,
        '',
        'Use this code to confirm your new email address in Minepanel:',
        code,
        '',
        'If you did not request this change, you can ignore this email.',
      ].join('\n'),
      html: this.buildEmailChangeCodeHtml(username, code),
    });
  }

  async sendTestEmail(to: string): Promise<void> {
    await this.requireSmtp('Email delivery is not configured');
    const smtp = await this.instanceSettings.getSmtp();

    await this.getTransporter().sendMail({
      from: smtp.from,
      to,
      subject: 'Minepanel | SMTP test',
      text: 'This is a test email from Minepanel. Your SMTP settings are working.',
    });
  }

  private async requireSmtp(message: string) {
    const smtp = await this.instanceSettings.getSmtp();
    if (!smtp.enabled) {
      throw new ServiceUnavailableException(message);
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      });
    }
    return smtp;
  }

  private getTransporter(): Transporter {
    return this.transporter;
  }

  private buildPasswordResetHtml(username: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <body style="margin:0;padding:0;background:#0b1220;color:#e5e7eb;font-family:Verdana,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111827;border:1px solid #22c55e;border-radius:18px;overflow:hidden;box-shadow:0 0 0 4px rgba(34,197,94,0.12);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#14532d 0%,#16a34a 100%);padding:24px 28px;border-bottom:4px solid #14532d;">
                      <div style="font-family:'Courier New',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#dcfce7;margin-bottom:10px;">
                        Minepanel Recovery
                      </div>
                      <div style="font-family:'Courier New',monospace;font-size:34px;line-height:1.1;font-weight:700;color:#ffffff;text-shadow:0 2px 0 rgba(0,0,0,0.35);">
                        Password Reset
                      </div>
                      <div style="margin-top:10px;font-size:14px;line-height:1.6;color:#ecfdf5;">
                        Recover your control panel access and get back to your Minecraft servers.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px;">
                      <div style="font-size:16px;line-height:1.8;color:#f3f4f6;">
                        Hello <strong style="color:#86efac;">${this.escapeHtml(username)}</strong>,
                      </div>

                      <div style="margin-top:16px;font-size:15px;line-height:1.8;color:#d1d5db;">
                        A request was made to reset the password for your <strong style="color:#ffffff;">Minepanel</strong> account.
                        If that was you, use the button below to choose a new password.
                      </div>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" style="display:inline-block;background:#22c55e;color:#08110c;text-decoration:none;font-family:'Courier New',monospace;font-size:16px;font-weight:700;padding:16px 28px;border-radius:12px;border:2px solid #4ade80;box-shadow:0 4px 0 #166534;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top:24px;padding:16px 18px;background:#0f172a;border:1px solid #374151;border-radius:12px;font-size:13px;line-height:1.7;color:#cbd5e1;">
                        If the button does not work, copy and paste this link into your browser:<br />
                        <a href="${resetUrl}" style="color:#4ade80;word-break:break-all;text-decoration:none;">${resetUrl}</a>
                      </div>

                      <div style="margin-top:24px;padding:16px 18px;background:#1f2937;border-left:4px solid #ef4444;border-radius:10px;font-size:14px;line-height:1.7;color:#e5e7eb;">
                        If you did not request this change, you can safely ignore this email.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:18px 28px;background:#0b1120;border-top:1px solid #1f2937;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">
                      Minepanel · Minecraft server management made simple
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private buildUserInvitationHtml(inviteUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <body style="margin:0;padding:0;background:#0b1220;color:#e5e7eb;font-family:Verdana,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111827;border:1px solid #22c55e;border-radius:18px;overflow:hidden;box-shadow:0 0 0 4px rgba(34,197,94,0.12);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#14532d 0%,#16a34a 100%);padding:24px 28px;border-bottom:4px solid #14532d;">
                      <div style="font-family:'Courier New',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#dcfce7;margin-bottom:10px;">
                        Minepanel Access
                      </div>
                      <div style="font-family:'Courier New',monospace;font-size:34px;line-height:1.1;font-weight:700;color:#ffffff;text-shadow:0 2px 0 rgba(0,0,0,0.35);">
                        You are invited
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px;">
                      <div style="font-size:15px;line-height:1.8;color:#d1d5db;">
                        A Minepanel administrator invited you to create an account.
                      </div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                        <tr>
                          <td align="center">
                            <a href="${inviteUrl}" style="display:inline-block;background:#22c55e;color:#08110c;text-decoration:none;font-family:'Courier New',monospace;font-size:16px;font-weight:700;padding:16px 28px;border-radius:12px;border:2px solid #4ade80;box-shadow:0 4px 0 #166534;">
                              Accept Invitation
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="margin-top:24px;padding:16px 18px;background:#0f172a;border:1px solid #374151;border-radius:12px;font-size:13px;line-height:1.7;color:#cbd5e1;">
                        If the button does not work, copy and paste this link into your browser:<br />
                        <a href="${inviteUrl}" style="color:#4ade80;word-break:break-all;text-decoration:none;">${inviteUrl}</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private buildEmailChangeCodeHtml(username: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <body style="margin:0;padding:0;background:#0b1220;color:#e5e7eb;font-family:Verdana,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111827;border:1px solid #22c55e;border-radius:18px;overflow:hidden;box-shadow:0 0 0 4px rgba(34,197,94,0.12);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#14532d 0%,#16a34a 100%);padding:24px 28px;border-bottom:4px solid #14532d;">
                      <div style="font-family:'Courier New',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#dcfce7;margin-bottom:10px;">
                        Minepanel Security
                      </div>
                      <div style="font-family:'Courier New',monospace;font-size:34px;line-height:1.1;font-weight:700;color:#ffffff;text-shadow:0 2px 0 rgba(0,0,0,0.35);">
                        Confirm Email Change
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px;">
                      <div style="font-size:16px;line-height:1.8;color:#f3f4f6;">
                        Hello <strong style="color:#86efac;">${this.escapeHtml(username)}</strong>,
                      </div>
                      <div style="margin-top:16px;font-size:15px;line-height:1.8;color:#d1d5db;">
                        Enter the following code in Minepanel to confirm your new email address.
                      </div>
                      <div style="margin-top:24px;padding:18px;background:#0f172a;border:1px solid #4ade80;border-radius:14px;text-align:center;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#86efac;">
                        ${this.escapeHtml(code)}
                      </div>
                      <div style="margin-top:24px;padding:16px 18px;background:#1f2937;border-left:4px solid #ef4444;border-radius:10px;font-size:14px;line-height:1.7;color:#e5e7eb;">
                        If you did not request this change, you can safely ignore this email.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
