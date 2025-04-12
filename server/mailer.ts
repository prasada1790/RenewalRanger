import nodemailer from 'nodemailer';

// Create a development-only test account for nodemailer
// This avoids the need for actual SMTP credentials during development
// In production, use environment variables for the actual SMTP server
let transporter: nodemailer.Transporter;

async function createTransporter() {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    // Production transporter with real SMTP settings
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });
  } else {
    // In development, we'll create a testing account that outputs to console
    console.log('[Mailer] Using development mode email transport');
    
    return nodemailer.createTransport({
      jsonTransport: true // This will output the email content to the console
    });
  }
}

// Initialize the transporter
(async () => {
  transporter = await createTransporter();
})();

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using the configured transporter
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Ensure transporter is initialized
    if (!transporter) {
      transporter = await createTransporter();
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'renewals@example.com',
      ...options
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // In development, log the email content to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Mailer] Email sent (development mode):');
      console.log('[Mailer] To:', options.to);
      console.log('[Mailer] Subject:', options.subject);
      
      if (info.message) {
        // Log what would have been sent (jsonTransport provides this)
        try {
          const jsonOutput = JSON.parse(info.message);
          console.log('[Mailer] Mail content:', jsonOutput);
        } catch (e) {
          console.log('[Mailer] Mail content:', info.message);
        }
      }
    } else {
      console.log(`[Mailer] Email sent to ${options.to}`);
    }
    
    return true;
  } catch (error) {
    console.error('[Mailer] Failed to send email:', error);
    return false;
  }
}

/**
 * Generate HTML content for renewal reminder emails
 */
export function generateRenewalReminderHtml(params: {
  clientName: string;
  itemName: string;
  itemType: string;
  expiryDate: Date;
  daysLeft: number;
  notes?: string;
}): string {
  const { clientName, itemName, itemType, expiryDate, daysLeft, notes } = params;
  
  const formattedDate = expiryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const urgency = daysLeft <= 7 
    ? 'urgent'
    : daysLeft <= 14 
      ? 'important' 
      : 'notice';

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          .urgent { color: #EF4444; font-weight: bold; }
          .important { color: #F59E0B; font-weight: bold; }
          .notice { color: #3B82F6; font-weight: bold; }
          .details { margin: 15px 0; }
          .detail-row { display: flex; margin-bottom: 5px; }
          .detail-label { width: 120px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Renewal Reminder</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>This is a reminder that the following item is due for renewal:</p>
            
            <div class="details">
              <div class="detail-row">
                <div class="detail-label">Client:</div>
                <div>${clientName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Item:</div>
                <div>${itemName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Type:</div>
                <div>${itemType}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Expiry Date:</div>
                <div>${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="${urgency}">
                  ${daysLeft <= 0 
                    ? 'EXPIRED'
                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
                </div>
              </div>
              ${notes ? `
              <div class="detail-row">
                <div class="detail-label">Notes:</div>
                <div>${notes}</div>
              </div>
              ` : ''}
            </div>
            
            <p>Please take appropriate action to renew this item before its expiration date.</p>
            <p>Thank you.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Renewal Manager System.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
