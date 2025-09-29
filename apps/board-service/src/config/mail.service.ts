import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  async sendInviteEmail(
    to: string,
    boardTitle: string,
    inviterEmail: string,
    inviteUrl: string,
    // inviter: string,
  ) {
    const mailOptions = {
      from: `"${inviterEmail}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `You’ve been invited to join board "${boardTitle}"`,
      html: `
        <p>${inviterEmail} invited you to collaborate on the board <strong>${boardTitle}</strong>.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${inviteUrl}">${inviteUrl}</a>
        <p>This link expires in 7 days.</p>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendAccessRequestEmail(
    to: string,
    boardTitle: string,
    requester: string,
    role: string,
    message?: string,
    manageLink?: string, // Add the new parameter
  ) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: `Access request for board "${boardTitle}"`,
      html: `
      <p>${requester} has requested <strong>${role}</strong> access to your board <strong>${boardTitle}</strong>.</p>
      ${message ? `<p>Message: ${message}</p>` : ''}
      ${manageLink ? `<a href="${manageLink}">Click here to manage sharing</a>` : ''}
    `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendAccessResponseEmail(
    to: string,
    boardTitle: string,
    status: 'approved' | 'denied',
    role: string,
  ) {
    const subject =
      status === 'approved'
        ? `Access approved for board "${boardTitle}"`
        : `Access denied for board "${boardTitle}"`;

    const html =
      status === 'approved'
        ? `<p>Your request for <strong>${role}</strong> access to <strong>${boardTitle}</strong> has been <span style="color:green">approved</span>.</p>`
        : `<p>Your request for <strong>${role}</strong> access to <strong>${boardTitle}</strong> has been <span style="color:red">denied</span>.</p>`;

    return this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
  }
}
