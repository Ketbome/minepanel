import { ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AuthMailService } from './auth-mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('AuthMailService', () => {
  const smtp = { enabled: true, host: 'smtp.example.com', port: 587, secure: false, user: 'u', pass: 'p', from: 'Minepanel <no-reply@example.com>' };
  let sendMail: jest.Mock;
  let instanceSettings: { getSmtp: jest.Mock; registerResetHandler: jest.Mock };
  let reset: () => void;
  let service: AuthMailService;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue(undefined);
    (nodemailer.createTransport as jest.Mock).mockReset().mockReturnValue({ sendMail });
    instanceSettings = {
      getSmtp: jest.fn().mockResolvedValue(smtp),
      registerResetHandler: jest.fn((handler) => {
        reset = handler;
      }),
    };
    service = new AuthMailService(instanceSettings as any);
  });

  it('reports configuration state', async () => {
    expect(await service.isConfigured()).toBe(true);
    instanceSettings.getSmtp.mockResolvedValue({ enabled: false });
    expect(await service.isConfigured()).toBe(false);
  });

  it('refuses to send when smtp is off', async () => {
    instanceSettings.getSmtp.mockResolvedValue({ enabled: false });
    await expect(service.sendPasswordResetEmail('a@x.com', 'a', 'https://x')).rejects.toThrow(ServiceUnavailableException);
    await expect(service.sendUserInvitationEmail('a@x.com', 'https://x')).rejects.toThrow(ServiceUnavailableException);
    await expect(service.sendEmailChangeCodeEmail('a@x.com', 'a', '123456')).rejects.toThrow(ServiceUnavailableException);
    await expect(service.sendTestEmail('a@x.com')).rejects.toThrow(ServiceUnavailableException);
  });

  it('sends every email type through one cached transporter', async () => {
    await service.sendPasswordResetEmail('a@x.com', '<alice>', 'https://panel/?resetToken=t');
    await service.sendUserInvitationEmail('b@x.com', 'https://panel/?inviteToken=i');
    await service.sendEmailChangeCodeEmail('c@x.com', 'carol "c"', '123456');
    await service.sendTestEmail('d@x.com');

    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ host: 'smtp.example.com', port: 587, secure: false, auth: { user: 'u', pass: 'p' } });
    expect(sendMail).toHaveBeenCalledTimes(4);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ from: smtp.from, to: 'a@x.com', subject: 'Minepanel | Password reset' });
    expect(sendMail.mock.calls[0][0].html).toContain('&lt;alice&gt;');
    expect(sendMail.mock.calls[0][0].text).toContain('https://panel/?resetToken=t');
    expect(sendMail.mock.calls[1][0].html).toContain('https://panel/?inviteToken=i');
    expect(sendMail.mock.calls[2][0].html).toContain('carol &quot;c&quot;');
    expect(sendMail.mock.calls[2][0].text).toContain('123456');
    expect(sendMail.mock.calls[3][0].subject).toBe('Minepanel | SMTP test');
  });

  it('rebuilds the transporter after settings change', async () => {
    await service.sendTestEmail('d@x.com');
    reset();
    await service.sendTestEmail('d@x.com');
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
  });
});
