import nodemailer from 'nodemailer';
import { Merchant } from '@prisma/client';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendWelcomeEmail(merchant: Merchant, userEmail: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@dms.com',
      to: userEmail,
      subject: 'Welcome to Document Management System',
      html: this.generateWelcomeEmailTemplate(merchant, userEmail),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  private generateWelcomeEmailTemplate(merchant: Merchant, userEmail: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to DMS</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Document Management System</h1>
          </div>
          <div class="content">
            <h3>Dear ${merchant.legalName},</h3>
            <p>Congratulations! Your merchant account has been created successfully.</p>
            
            <p><strong>Account Details:</strong></p>
            <ul>
              <li><strong>Business Name:</strong> ${merchant.legalName}</li>
              <li><strong>Business Type:</strong> ${merchant.businessType}</li>
              <li><strong>Login Email:</strong> ${userEmail}</li>
              <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            
            <p>You can now log in to your account using your registered email address and start managing your documents securely.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                Login to Your Account
              </a>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Complete your KYC verification (PAN & Aadhaar)</li>
              <li>Upload your business documents</li>
              <li>Invite team members to collaborate</li>
            </ol>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>
            The DMS Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Document Management System. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();