import { MailService } from '@sendgrid/mail';
import { 
  createAdminMeetingNotification, 
  createAdminOrderNotification, 
  createUserMeetingConfirmation, 
  createUserOrderConfirmation,
  EMAIL_TEMPLATES 
} from './email-templates';
import type { MailDataRequired } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email sending will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Always log the email content for debugging and as backup
  console.log('\n📧 ORDER CONFIRMATION EMAIL DETAILS:');
  console.log('═══════════════════════════════════════');
  console.log(`📨 To: ${params.to}`);
  console.log(`📤 From: ${params.from}`);
  console.log(`📋 Subject: ${params.subject}`);
  console.log('───────────────────────────────────────');
  console.log('📄 Email Content:');
  console.log(params.text || params.html);
  console.log('═══════════════════════════════════════\n');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️  SendGrid API key not configured. Email logged above - you can copy this information.');
    return true; // Return true so order processing continues
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    console.log('✅ Order confirmation email sent successfully to:', params.to);
    return true;
  } catch (error: any) {
    console.error('❌ SendGrid email error - but email content logged above');
    
    if (error.response?.body?.errors) {
      console.error('📧 SendGrid Error Details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    
    // Return true anyway since we logged the email content
    console.log('✅ Email content has been logged above as backup');
    return true;
  }
}

// Enhanced email sending with admin notifications
export async function sendDualEmails(userEmail: MailDataRequired, adminEmail: MailDataRequired): Promise<{ userSent: boolean; adminSent: boolean }> {
  const results = { userSent: false, adminSent: false };
  
  // Log both emails for debugging
  console.log('\n📧 DUAL EMAIL NOTIFICATION SYSTEM:');
  console.log('═══════════════════════════════════════');
  console.log('📨 USER EMAIL:');
  console.log(`To: ${userEmail.to}`);
  console.log(`Subject: ${userEmail.subject}`);
  console.log('───────────────────────────────────────');
  console.log('📨 ADMIN EMAIL:');
  console.log(`To: ${adminEmail.to}`);
  console.log(`Subject: ${adminEmail.subject}`);
  console.log('═══════════════════════════════════════\n');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️  SendGrid API key not configured. Emails logged above.');
    return { userSent: true, adminSent: true }; // Return true so processing continues
  }

  try {
    // Send user email
    await mailService.send(userEmail);
    results.userSent = true;
    console.log('✅ User confirmation email sent successfully to:', userEmail.to);
  } catch (error: any) {
    console.error('❌ Failed to send user email:', error.message);
  }

  try {
    // Send admin email
    await mailService.send(adminEmail);
    results.adminSent = true;
    console.log('✅ Admin notification email sent successfully to:', adminEmail.to);
  } catch (error: any) {
    console.error('❌ Failed to send admin email:', error.message);
  }

  return results;
}

// Meeting booking email automation
export async function sendMeetingBookingEmails(meetingData: any): Promise<{ userSent: boolean; adminSent: boolean }> {
  const userEmail = createUserMeetingConfirmation(meetingData);
  const adminEmail = createAdminMeetingNotification(meetingData);
  
  return await sendDualEmails(userEmail, adminEmail);
}

// Order confirmation email automation
export async function sendOrderConfirmationEmails(orderData: any): Promise<{ userSent: boolean; adminSent: boolean }> {
  const userEmail = createUserOrderConfirmation(orderData);
  const adminEmail = createAdminOrderNotification(orderData);
  
  return await sendDualEmails(userEmail, adminEmail);
}

// Rate limiting for email sending (prevent spam)
const emailRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_EMAILS_PER_WINDOW = 5;

export function checkEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, timestamp] of emailRateLimit.entries()) {
    if (timestamp < windowStart) {
      emailRateLimit.delete(key);
    }
  }
  
  // Count emails in current window
  const emailsInWindow = Array.from(emailRateLimit.values())
    .filter(timestamp => timestamp > windowStart).length;
  
  if (emailsInWindow >= MAX_EMAILS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  // Add current email to tracking
  emailRateLimit.set(`${email}-${now}`, now);
  return true;
}

// Email templates
export function createAppointmentConfirmationEmail(appointmentData: any) {
  const { customerName, customerEmail, date, time, type, id } = appointmentData;
  
  const appointmentDate = new Date(date);
  const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const meetingType = type.replace('_', ' ').toUpperCase();
  
  const subject = `✅ Appointment Confirmed - ${formattedDate} at ${time}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Appointment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B4513, #CD853F); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; }
            .appointment-details { background-color: #f8f9fa; border-left: 4px solid #8B4513; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .video-link { background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #8B4513; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .logo { font-size: 24px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🪑 IndoSaga Furniture</div>
                <h1 style="margin: 10px 0;">✅ Appointment Confirmed!</h1>
                <p>Your virtual furniture consultation is all set</p>
            </div>
            
            <div class="content">
                <p>Dear ${customerName},</p>
                
                <p>Thank you for booking a virtual consultation with IndoSaga Furniture! We're excited to help you discover our premium teak wood furniture collection.</p>
                
                <div class="appointment-details">
                    <h3 style="margin-top: 0; color: #8B4513;">📅 Appointment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Appointment ID:</td>
                            <td style="padding: 8px 0;">${id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                            <td style="padding: 8px 0;">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                            <td style="padding: 8px 0;">${time} IST</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Meeting Type:</td>
                            <td style="padding: 8px 0;">${meetingType}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="video-link">
                    <h3 style="margin-top: 0; color: #0066cc;">🎥 Join Your Virtual Meeting</h3>
                    <p>When it's time for your appointment, click the link below to join your virtual consultation:</p>
                    <a href="https://meet.google.com/appointment-${id}" class="btn">Join Virtual Showroom</a>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        <strong>Note:</strong> Our furniture expert will call you 2-3 minutes before the scheduled time. Please keep your phone handy.
                    </p>
                </div>
                
                <h3 style="color: #8B4513;">What to Expect:</h3>
                <ul style="padding-left: 20px;">
                    <li>Live virtual tour of our premium teak furniture collection</li>
                    <li>Personalized recommendations based on your needs</li>
                    <li>Real-time Q&A with our furniture experts</li>
                    <li>Exclusive offers and customization options</li>
                </ul>
                
                <h3 style="color: #8B4513;">Need to Reschedule?</h3>
                <p>If you need to change your appointment time, please contact us at least 2 hours in advance:</p>
                <p>📞 <strong>Phone:</strong> +91 98765 43210<br>
                📧 <strong>Email:</strong> appointments@indosagafurniture.com</p>
            </div>
            
            <div class="footer">
                <p><strong>IndoSaga Furniture</strong><br>
                Premium Teak Wood Furniture<br>
                📍 123 Furniture Street, Mumbai, India<br>
                📞 +91 98765 43210 | 📧 info@indosagafurniture.com</p>
                
                <p style="margin-top: 15px;">Thank you for choosing IndoSaga Furniture for your home furnishing needs!</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const text = `
Appointment Confirmed - IndoSaga Furniture

Dear ${customerName},

Your virtual furniture consultation has been confirmed!

Appointment Details:
- ID: ${id}
- Date: ${formattedDate}
- Time: ${time} IST
- Type: ${meetingType}

Join your virtual meeting: https://meet.google.com/appointment-${id}

Our furniture expert will call you 2-3 minutes before the scheduled time.

Need to reschedule? Contact us at +91 98765 43210

Thank you for choosing IndoSaga Furniture!

IndoSaga Furniture
Premium Teak Wood Furniture
📍 123 Furniture Street, Mumbai, India
📞 +91 98765 43210 | 📧 info@indosagafurniture.com
  `;
  
  return {
    to: customerEmail,
    from: 'appointments@indosagafurniture.com',
    subject,
    html,
    text
  };
}

export function createSupportTicketConfirmationEmail(ticketData: any) {
  const { customerName, customerEmail, subject: ticketSubject, priority, ticketId } = ticketData;
  
  const priorityColors = {
    low: '#28a745',
    medium: '#ffc107', 
    high: '#dc3545'
  };
  
  const priorityColor = priorityColors[priority as keyof typeof priorityColors] || '#6c757d';
  
  const subject = `🎫 Support Ticket Created - ${ticketId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Support Ticket Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B4513, #CD853F); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; }
            .ticket-details { background-color: #f8f9fa; border-left: 4px solid #8B4513; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: white; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .logo { font-size: 24px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🪑 IndoSaga Furniture</div>
                <h1 style="margin: 10px 0;">🎫 Support Ticket Created</h1>
                <p>We've received your request and will respond soon</p>
            </div>
            
            <div class="content">
                <p>Dear ${customerName},</p>
                
                <p>Thank you for contacting IndoSaga Furniture support. We have successfully received your request and created a support ticket for you.</p>
                
                <div class="ticket-details">
                    <h3 style="margin-top: 0; color: #8B4513;">🎫 Ticket Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Ticket ID:</td>
                            <td style="padding: 8px 0;"><strong>${ticketId}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Subject:</td>
                            <td style="padding: 8px 0;">${ticketSubject}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Priority:</td>
                            <td style="padding: 8px 0;">
                                <span class="priority-badge" style="background-color: ${priorityColor};">${priority}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Status:</td>
                            <td style="padding: 8px 0;">Open</td>
                        </tr>
                    </table>
                </div>
                
                <h3 style="color: #8B4513;">What Happens Next?</h3>
                <ul style="padding-left: 20px;">
                    <li><strong>Acknowledgment:</strong> You'll receive this confirmation email immediately</li>
                    <li><strong>Assignment:</strong> Your ticket will be assigned to the appropriate team member</li>
                    <li><strong>Response:</strong> We'll respond within 24 hours (or sooner for high priority tickets)</li>
                    <li><strong>Resolution:</strong> We'll work with you until your issue is completely resolved</li>
                </ul>
                
                <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #0066cc;">📧 Keep This Email</h4>
                    <p style="margin-bottom: 0; font-size: 14px;">Please save this email for your records. When replying to any communication about this ticket, include the Ticket ID <strong>${ticketId}</strong> for faster service.</p>
                </div>
                
                <h3 style="color: #8B4513;">Need Immediate Help?</h3>
                <p>For urgent matters, you can also reach us directly:</p>
                <p>📞 <strong>Phone:</strong> +91 98765 43210 (9 AM - 6 PM IST)<br>
                📧 <strong>Email:</strong> support@indosagafurniture.com<br>
                💬 <strong>Live Chat:</strong> Available on our website</p>
            </div>
            
            <div class="footer">
                <p><strong>IndoSaga Furniture Support Team</strong><br>
                Premium Teak Wood Furniture<br>
                📍 123 Furniture Street, Mumbai, India<br>
                📞 +91 98765 43210 | 📧 support@indosagafurniture.com</p>
                
                <p style="margin-top: 15px;">Thank you for choosing IndoSaga Furniture!</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const text = `
Support Ticket Created - IndoSaga Furniture

Dear ${customerName},

We have received your support request and created ticket ${ticketId}.

Ticket Details:
- Ticket ID: ${ticketId}
- Subject: ${ticketSubject}
- Priority: ${priority}
- Status: Open

We will respond within 24 hours. For urgent matters, call +91 98765 43210.

Thank you for contacting IndoSaga Furniture!

IndoSaga Furniture Support Team
📍 123 Furniture Street, Mumbai, India
📞 +91 98765 43210 | 📧 support@indosagafurniture.com
  `;
  
  return {
    to: customerEmail,
    from: 'support@indosagafurniture.com',
    subject,
    html,
    text
  };
}

// Legacy function - kept for backward compatibility
export function createOrderConfirmationEmail(orderData: any, customerEmail: string) {
  const { id: orderId, customerName, customerPhone, shippingAddress, paymentMethod, total, orderItems, razorpayPaymentId, paymentStatus } = orderData;
  
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Format payment method for display
  const paymentMethodMap: Record<string, string> = {
    'card': 'Credit/Debit Card',
    'upi': 'UPI Payment',
    'netbanking': 'Net Banking',
    'wallet': 'Digital Wallet',
    'cod': 'Cash on Delivery',
    'qr': 'QR Code Payment'
  };
  const paymentMethodDisplay = paymentMethodMap[paymentMethod] || paymentMethod;

  // Generate product list for email
  const productList = orderItems?.map((item: any) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #ddd;">${item.product?.name || 'Product'}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">₹${parseFloat(item.price || "0").toLocaleString('en-IN')}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">₹${(parseFloat(item.price || "0") * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('') || '';

  const subject = `Order Confirmation - IndoSaga Furniture`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B4513, #CD853F); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; }
            .order-details { background-color: #f8f9fa; border-left: 4px solid #8B4513; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .products-table th, .products-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .products-table th { background-color: #f5f5f5; font-weight: bold; color: #8B4513; }
            .total-section { background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: right; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .logo { font-size: 24px; font-weight: bold; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: white; background-color: #28a745; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🪑 IndoSaga Furniture</div>
                <h1 style="margin: 10px 0;">✅ Order Confirmed!</h1>
                <p>Thank you for your purchase of premium teak furniture</p>
            </div>
            
            <div class="content">
                <p>Dear ${customerName || 'Valued Customer'},</p>
                
                <p>We're delighted to confirm that your order has been successfully placed! Thank you for choosing IndoSaga Furniture for your premium teak wood furniture needs.</p>
                
                <div class="order-details">
                    <h3 style="margin-top: 0; color: #8B4513;">📋 Order Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Order ID:</td>
                            <td style="padding: 8px 0;"><strong>#${orderId}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Order Date:</td>
                            <td style="padding: 8px 0;">${currentDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Method:</td>
                            <td style="padding: 8px 0;">${paymentMethodDisplay}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Status:</td>
                            <td style="padding: 8px 0;">
                                <span class="status-badge" style="background-color: ${paymentStatus === 'paid' ? '#28a745' : '#ffc107'};">${paymentStatus === 'paid' ? 'PAID' : 'PENDING'}</span>
                            </td>
                        </tr>
                        ${razorpayPaymentId ? `
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment ID:</td>
                            <td style="padding: 8px 0;">${razorpayPaymentId}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Delivery Address:</td>
                            <td style="padding: 8px 0;">${shippingAddress || 'Not provided'}</td>
                        </tr>
                    </table>
                </div>
                
                ${orderItems && orderItems.length > 0 ? `
                <h3 style="color: #8B4513;">📦 Order Items</h3>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th style="text-align: center;">Quantity</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productList}
                    </tbody>
                </table>
                ` : ''}
                
                <div class="total-section">
                    <h3 style="margin-top: 0; color: #0066cc;">💰 Order Total</h3>
                    <div style="font-size: 24px; font-weight: bold; color: #8B4513;">₹${parseFloat(total || "0").toLocaleString('en-IN')}</div>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">*Inclusive of all taxes. Free delivery across India</p>
                </div>
                
                <h3 style="color: #8B4513;">📞 What's Next?</h3>
                <ul style="padding-left: 20px;">
                    <li><strong>Order Processing:</strong> Your order is being prepared with care by our craftsmen</li>
                    <li><strong>Quality Check:</strong> Each piece undergoes rigorous quality inspection</li>
                    <li><strong>Delivery Updates:</strong> You'll receive tracking information via SMS and email</li>
                    <li><strong>Assembly Service:</strong> Our team will help with professional assembly at your location</li>
                </ul>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #8B4513;">🏠 Premium Teak Wood Care</h4>
                    <p style="margin-bottom: 0; font-size: 14px;">Your furniture comes with a detailed care guide to maintain its beauty for generations. Regular dusting and occasional oiling will keep the natural teak finish lustrous.</p>
                </div>
                
                <h3 style="color: #8B4513;">📞 Need Help?</h3>
                <p>Our customer service team is here to assist you:</p>
                <p>📞 <strong>Phone:</strong> +91 98765 43210 (9 AM - 7 PM IST)<br>
                📧 <strong>Email:</strong> orders@indosagafurniture.com<br>
                💬 <strong>WhatsApp:</strong> +91 98765 43210</p>
            </div>
            
            <div class="footer">
                <p><strong>IndoSaga Furniture</strong><br>
                Premium Teak Wood Furniture<br>
                📍 123 Furniture Street, Mumbai, India<br>
                📞 +91 98765 43210 | 📧 info@indosagafurniture.com</p>
                
                <p style="margin-top: 15px;">Thank you for choosing IndoSaga Furniture for your home furnishing needs!</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const text = `
Order Confirmation - IndoSaga Furniture

Dear ${customerName || 'Valued Customer'},

Your order has been successfully confirmed!

Order Details:
- Order ID: #${orderId}
- Order Date: ${currentDate}
- Payment Method: ${paymentMethodDisplay}
- Payment Status: ${paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
${razorpayPaymentId ? `- Payment ID: ${razorpayPaymentId}` : ''}
- Delivery Address: ${shippingAddress || 'Not provided'}

Order Total: ₹${parseFloat(total || "0").toLocaleString('en-IN')}

What's Next:
1. Order Processing: Your order is being prepared with care
2. Quality Check: Each piece undergoes rigorous inspection
3. Delivery Updates: You'll receive tracking information
4. Assembly Service: Professional assembly at your location

Need Help?
Phone: +91 98765 43210 (9 AM - 7 PM IST)
Email: orders@indosagafurniture.com
WhatsApp: +91 98765 43210

Thank you for choosing IndoSaga Furniture!

IndoSaga Furniture
Premium Teak Wood Furniture
📍 123 Furniture Street, Mumbai, India
📞 +91 98765 43210 | 📧 info@indosagafurniture.com
  `;
  
  return {
    to: customerEmail,
    from: 'kadamprajwal358@gmail.com', // Use verified email address from your SendGrid account
    subject,
    html,
    text
  };
}

// Legacy function - kept for backward compatibility  
export function createContactInquiryNotificationEmail(inquiryData: any) {
  const { firstName, lastName, email, phone, inquiryType, message, id } = inquiryData;
  
  const inquiryTypeMap = {
    'product-inquiry': 'Product Inquiry',
    'custom-order': 'Custom Order',
    'bulk-order': 'Bulk Order',
    'general-question': 'General Question',
    'complaint': 'Complaint',
    'feedback': 'Feedback'
  };
  
  const displayInquiryType = inquiryTypeMap[inquiryType as keyof typeof inquiryTypeMap] || inquiryType;
  const customerName = `${firstName} ${lastName}`;
  
  const subject = `📩 New Contact Inquiry: ${displayInquiryType} from ${customerName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>New Contact Inquiry</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 700px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B4513, #CD853F); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; }
            .inquiry-details { background-color: #f8f9fa; border-left: 4px solid #8B4513; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .customer-message { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .contact-actions { background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .logo { font-size: 24px; font-weight: bold; }
            .inquiry-type { display: inline-block; padding: 4px 12px; background-color: #8B4513; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .btn { display: inline-block; padding: 10px 20px; background-color: #8B4513; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🪑 IndoSaga Furniture</div>
                <h1 style="margin: 10px 0;">📩 New Contact Inquiry</h1>
                <p>A customer has submitted an inquiry on your website</p>
            </div>
            
            <div class="content">
                <div class="inquiry-details">
                    <h3 style="margin-top: 0; color: #8B4513;">👤 Customer Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Name:</td>
                            <td style="padding: 8px 0;"><strong>${customerName}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
                            <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #8B4513;">${email}</a></td>
                        </tr>
                        ${phone ? `
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
                            <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #8B4513;">${phone}</a></td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Inquiry Type:</td>
                            <td style="padding: 8px 0;">
                                <span class="inquiry-type">${displayInquiryType}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Inquiry ID:</td>
                            <td style="padding: 8px 0;">${id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Submitted:</td>
                            <td style="padding: 8px 0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                        </tr>
                    </table>
                </div>
                
                <div class="customer-message">
                    <h3 style="margin-top: 0; color: #8B4513;">💬 Customer Message</h3>
                    <p style="margin-bottom: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${message}</p>
                </div>
                
                <div class="contact-actions">
                    <h3 style="margin-top: 0; color: #0066cc;">📞 Quick Actions</h3>
                    <p style="margin-bottom: 15px;">Respond to this inquiry quickly to provide excellent customer service:</p>
                    <div style="text-align: center;">
                        <a href="mailto:${email}?subject=Re: ${displayInquiryType} - IndoSaga Furniture&body=Dear ${customerName},%0A%0AThank you for your inquiry about ${displayInquiryType.toLowerCase()}. We appreciate your interest in IndoSaga Furniture.%0A%0A" class="btn">📧 Reply by Email</a>
                        ${phone ? `<a href="tel:${phone}" class="btn">📞 Call Customer</a>` : ''}
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 15px; text-align: center;">
                        <strong>Tip:</strong> Responding within 2-4 hours shows excellent customer service and increases conversion rates.
                    </p>
                </div>
                
                <h3 style="color: #8B4513;">📋 Next Steps</h3>
                <ul style="padding-left: 20px;">
                    <li><strong>Immediate Response:</strong> Send a personalized reply acknowledging their inquiry</li>
                    <li><strong>Assessment:</strong> Review their requirements and prepare relevant product information</li>
                    <li><strong>Follow-up:</strong> Schedule a call or showroom visit if appropriate</li>
                    <li><strong>Documentation:</strong> Log this inquiry in your CRM system</li>
                </ul>
            </div>
            
            <div class="footer">
                <p><strong>IndoSaga Furniture - Admin Notification</strong><br>
                This email was automatically generated when a customer submitted the contact form on your website.<br>
                📧 kadamprajwal358@gmail.com</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const text = `
New Contact Inquiry - IndoSaga Furniture

Customer Information:
- Name: ${customerName}
- Email: ${email}
${phone ? `- Phone: ${phone}` : ''}
- Inquiry Type: ${displayInquiryType}
- Inquiry ID: ${id}
- Submitted: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

Customer Message:
${message}

Quick Actions:
- Reply by email: ${email}
${phone ? `- Call customer: ${phone}` : ''}

Respond quickly to provide excellent customer service!

IndoSaga Furniture - Admin Notification
  `;
  
  return {
    to: 'kadamprajwal358@gmail.com',
    from: 'noreply@indosagafurniture.com',
    subject,
    html,
    text
  };
}