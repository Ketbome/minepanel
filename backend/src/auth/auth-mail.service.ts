import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class AuthMailService {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    const smtp = this.configService.get('smtp');

    return !!smtp?.host && !!smtp?.port && !!smtp?.user && !!smtp?.pass && !!smtp?.from;
  }

  async sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Password recovery is not configured');
    }

    await this.getTransporter().sendMail({
      from: this.configService.get('smtp.from'),
      to,
      subject: 'Minepanel password reset',
      text: [
        `Hello ${username},`,
        '',
        'We received a request to reset your Minepanel password.',
        `Open this link to choose a new password: ${resetUrl}`,
        '',
        'If you did not request this change, you can ignore this email.',
      ].join('\n'),
      html: `
        <p>Hello ${username},</p>
        <p>We received a request to reset your Minepanel password.</p>
        <p><a href="${resetUrl}">Open this link to choose a new password</a></p>
        <p>If you did not request this change, you can ignore this email.</p>
      `,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('smtp.host'),
      port: this.configService.get('smtp.port'),
      secure: this.configService.get('smtp.secure'),
      auth: {
        user: this.configService.get('smtp.user'),
        pass: this.configService.get('smtp.pass'),
      },
    });

    return this.transporter;
  }
}
