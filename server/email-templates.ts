import { MailDataRequired } from '@sendgrid/mail';

// Email template configurations
export const EMAIL_TEMPLATES = {
  ADMIN_EMAIL: 'kadamprajwal358@gmail.com',
  FROM_EMAIL: 'noreply@indosaga.com',
  FROM_NAME: 'IndoSaga Furniture'
};

// Admin notification templates
export function createAdminMeetingNotification(meetingData: any): MailDataRequired {
  const { customerName, customerEmail, customerPhone, appointmentDate, appointmentTime, meetingType, notes, id } = meetingData;
  
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const meetingTypeDisplay = meetingType.replace('_', ' ').toUpperCase();
  
  return {
    to: EMAIL_TEMPLATES.ADMIN_EMAIL,
    from: {
      email: EMAIL_TEMPLATES.FROM_EMAIL,
      name: EMAIL_TEMPLATES.FROM_NAME
    },
    subject: `🗓️ New Virtual Meeting Booking - ${customerName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>New Meeting Booking</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .meeting-details { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .customer-info { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .urgent-notice { background-color: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .logo { font-size: 24px; font-weight: bold; }
              .btn { display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">🪑 IndoSaga Furniture - Admin Alert</div>
                  <h1 style="margin: 10px 0;">🗓️ New Virtual Meeting Booking</h1>
                  <p>A customer has scheduled a virtual consultation</p>
              </div>
              
              <div class="content">
                  <div class="urgent-notice">
                      <h3 style="margin-top: 0; color: #dc2626;">⚠️ Action Required</h3>
                      <p style="margin-bottom: 0; font-weight: bold;">A new virtual meeting has been booked. Please prepare for the consultation and ensure availability.</p>
                  </div>
                  
                  <div class="customer-info">
                      <h3 style="margin-top: 0; color: #0ea5e9;">👤 Customer Information</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Name:</td>
                              <td style="padding: 8px 0;"><strong>${customerName}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
                              <td style="padding: 8px 0;"><a href="mailto:${customerEmail}" style="color: #0ea5e9;">${customerEmail}</a></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
                              <td style="padding: 8px 0;"><a href="tel:${customerPhone}" style="color: #0ea5e9;">${customerPhone || 'Not provided'}</a></td>
                          </tr>
                      </table>
                  </div>
                  
                  <div class="meeting-details">
                      <h3 style="margin-top: 0; color: #f59e0b;">📅 Meeting Details</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Meeting ID:</td>
                              <td style="padding: 8px 0;"><strong>${id}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                              <td style="padding: 8px 0;"><strong>${formattedDate}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                              <td style="padding: 8px 0;"><strong>${appointmentTime} IST</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Type:</td>
                              <td style="padding: 8px 0;"><strong>${meetingTypeDisplay}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Booked At:</td>
                              <td style="padding: 8px 0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                          </tr>
                      </table>
                      ${notes ? `
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f59e0b;">
                          <h4 style="margin-top: 0; color: #f59e0b;">📝 Customer Notes:</h4>
                          <p style="margin-bottom: 0; font-style: italic;">"${notes}"</p>
                      </div>
                      ` : ''}
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="mailto:${customerEmail}?subject=Re: Virtual Meeting Confirmation - IndoSaga Furniture&body=Dear ${customerName},%0A%0AThank you for booking a virtual consultation with IndoSaga Furniture.%0A%0A" class="btn">📧 Reply to Customer</a>
                      <a href="tel:${customerPhone}" class="btn">📞 Call Customer</a>
                  </div>
                  
                  <h3 style="color: #dc2626;">📋 Preparation Checklist</h3>
                  <ul style="padding-left: 20px;">
                      <li>Review customer's furniture requirements and notes</li>
                      <li>Prepare relevant product catalogs and pricing</li>
                      <li>Set up virtual showroom camera and lighting</li>
                      <li>Test video call equipment 15 minutes before meeting</li>
                      <li>Have product samples ready for demonstration</li>
                  </ul>
              </div>
              
              <div class="footer">
                  <p><strong>IndoSaga Furniture - Admin Dashboard</strong><br>
                  This is an automated notification from your website booking system.<br>
                  📧 Admin Email: ${EMAIL_TEMPLATES.ADMIN_EMAIL}</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
New Virtual Meeting Booking - IndoSaga Furniture

Customer Information:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone || 'Not provided'}

Meeting Details:
- Meeting ID: ${id}
- Date: ${formattedDate}
- Time: ${appointmentTime} IST
- Type: ${meetingTypeDisplay}
- Booked At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

${notes ? `Customer Notes: "${notes}"` : ''}

Action Required: Please prepare for the virtual consultation and ensure availability.

Contact Customer:
- Email: ${customerEmail}
- Phone: ${customerPhone || 'Not provided'}

IndoSaga Furniture - Admin Notification
    `
  };
}

export function createAdminOrderNotification(orderData: any): MailDataRequired {
  const { id: orderId, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, total, orderItems, razorpayPaymentId, paymentStatus } = orderData;
  
  const paymentMethodMap: Record<string, string> = {
    'card': 'Credit/Debit Card',
    'upi': 'UPI Payment',
    'netbanking': 'Net Banking',
    'wallet': 'Digital Wallet',
    'cod': 'Cash on Delivery',
    'qr': 'QR Code Payment'
  };
  const paymentMethodDisplay = paymentMethodMap[paymentMethod] || paymentMethod;

  const productList = orderItems?.map((item: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.product?.name || 'Product'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${parseFloat(item.price || "0").toLocaleString('en-IN')}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${(parseFloat(item.price || "0") * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('') || '';

  return {
    to: EMAIL_TEMPLATES.ADMIN_EMAIL,
    from: {
      email: EMAIL_TEMPLATES.FROM_EMAIL,
      name: EMAIL_TEMPLATES.FROM_NAME
    },
    subject: `🛒 New Order Received - ${customerName} - ₹${parseFloat(total || "0").toLocaleString('en-IN')}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>New Order Notification</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 700px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .order-summary { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .customer-info { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .products-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .products-table th, .products-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .products-table th { background-color: #f5f5f5; font-weight: bold; color: #dc2626; }
              .urgent-notice { background-color: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .logo { font-size: 24px; font-weight: bold; }
              .btn { display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
              .total-amount { font-size: 28px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">🪑 IndoSaga Furniture - Admin Alert</div>
                  <h1 style="margin: 10px 0;">🛒 New Order Received!</h1>
                  <p>A customer has completed a purchase on your website</p>
              </div>
              
              <div class="content">
                  <div class="urgent-notice">
                      <h3 style="margin-top: 0; color: #f59e0b;">⚡ Immediate Action Required</h3>
                      <p style="margin-bottom: 0; font-weight: bold;">New order received! Please process immediately for customer satisfaction.</p>
                  </div>
                  
                  <div class="total-amount">
                      💰 Order Value: ₹${parseFloat(total || "0").toLocaleString('en-IN')}
                  </div>
                  
                  <div class="customer-info">
                      <h3 style="margin-top: 0; color: #0ea5e9;">👤 Customer Information</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Name:</td>
                              <td style="padding: 8px 0;"><strong>${customerName}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
                              <td style="padding: 8px 0;"><a href="mailto:${customerEmail}" style="color: #0ea5e9;">${customerEmail}</a></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
                              <td style="padding: 8px 0;"><a href="tel:${customerPhone}" style="color: #0ea5e9;">${customerPhone || 'Not provided'}</a></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Delivery Address:</td>
                              <td style="padding: 8px 0;">${shippingAddress || 'Not provided'}</td>
                          </tr>
                      </table>
                  </div>
                  
                  <div class="order-summary">
                      <h3 style="margin-top: 0; color: #22c55e;">📋 Order Summary</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Order ID:</td>
                              <td style="padding: 8px 0;"><strong>#${orderId}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Method:</td>
                              <td style="padding: 8px 0;"><strong>${paymentMethodDisplay}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Status:</td>
                              <td style="padding: 8px 0;">
                                  <span style="background-color: ${paymentStatus === 'paid' ? '#22c55e' : '#f59e0b'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                                      ${paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
                                  </span>
                              </td>
                          </tr>
                          ${razorpayPaymentId ? `
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment ID:</td>
                              <td style="padding: 8px 0;">${razorpayPaymentId}</td>
                          </tr>
                          ` : ''}
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Order Time:</td>
                              <td style="padding: 8px 0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                          </tr>
                      </table>
                  </div>
                  
                  ${orderItems && orderItems.length > 0 ? `
                  <h3 style="color: #dc2626;">📦 Ordered Products</h3>
                  <table class="products-table">
                      <thead>
                          <tr>
                              <th>Product Name</th>
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
                  
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="mailto:${customerEmail}?subject=Order Confirmation - IndoSaga Furniture&body=Dear ${customerName},%0A%0AThank you for your order. We are processing it and will update you soon.%0A%0A" class="btn">📧 Contact Customer</a>
                      <a href="tel:${customerPhone}" class="btn">📞 Call Customer</a>
                  </div>
                  
                  <h3 style="color: #dc2626;">📋 Next Steps</h3>
                  <ul style="padding-left: 20px;">
                      <li><strong>Order Processing:</strong> Begin preparing the order for shipment</li>
                      <li><strong>Inventory Check:</strong> Verify product availability and quality</li>
                      <li><strong>Customer Communication:</strong> Send order confirmation and timeline</li>
                      <li><strong>Logistics:</strong> Arrange delivery and installation if required</li>
                      <li><strong>Payment:</strong> ${paymentStatus === 'paid' ? 'Payment confirmed - proceed with order' : 'Follow up on pending payment'}</li>
                  </ul>
              </div>
              
              <div class="footer">
                  <p><strong>IndoSaga Furniture - Admin Dashboard</strong><br>
                  This is an automated notification from your e-commerce system.<br>
                  📧 Admin Email: ${EMAIL_TEMPLATES.ADMIN_EMAIL}</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
New Order Received - IndoSaga Furniture

Customer Information:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone || 'Not provided'}
- Delivery Address: ${shippingAddress || 'Not provided'}

Order Summary:
- Order ID: #${orderId}
- Total Amount: ₹${parseFloat(total || "0").toLocaleString('en-IN')}
- Payment Method: ${paymentMethodDisplay}
- Payment Status: ${paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
${razorpayPaymentId ? `- Payment ID: ${razorpayPaymentId}` : ''}
- Order Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

${orderItems && orderItems.length > 0 ? `
Ordered Products:
${orderItems.map((item: any) => `- ${item.product?.name || 'Product'} x${item.quantity} - ₹${parseFloat(item.price || "0").toLocaleString('en-IN')}`).join('\n')}
` : ''}

Action Required: Process this order immediately for customer satisfaction.

Contact Customer:
- Email: ${customerEmail}
- Phone: ${customerPhone || 'Not provided'}

IndoSaga Furniture - Admin Notification
    `
  };
}

// User confirmation templates
export function createUserMeetingConfirmation(meetingData: any): MailDataRequired {
  const { customerName, customerEmail, appointmentDate, appointmentTime, meetingType, notes, id } = meetingData;
  
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const meetingTypeDisplay = meetingType.replace('_', ' ').toUpperCase();
  
  return {
    to: customerEmail,
    from: {
      email: EMAIL_TEMPLATES.FROM_EMAIL,
      name: EMAIL_TEMPLATES.FROM_NAME
    },
    subject: `✅ Virtual Meeting Confirmed - ${formattedDate} at ${appointmentTime}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Meeting Confirmation</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #8B4513, #CD853F); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .meeting-details { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .video-link { background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
              .next-steps { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .logo { font-size: 24px; font-weight: bold; }
              .btn { display: inline-block; padding: 15px 30px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">🪑 IndoSaga Furniture</div>
                  <h1 style="margin: 10px 0;">✅ Virtual Meeting Confirmed!</h1>
                  <p>Your furniture consultation is all set</p>
              </div>
              
              <div class="content">
                  <p>Dear ${customerName},</p>
                  
                  <p>Thank you for booking a virtual consultation with IndoSaga Furniture! We're excited to help you discover our premium teak wood furniture collection.</p>
                  
                  <div class="meeting-details">
                      <h3 style="margin-top: 0; color: #22c55e;">📅 Your Meeting Details</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666; width: 30%;">Meeting ID:</td>
                              <td style="padding: 8px 0;"><strong>${id}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
                              <td style="padding: 8px 0;"><strong>${formattedDate}</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                              <td style="padding: 8px 0;"><strong>${appointmentTime} IST</strong></td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Meeting Type:</td>
                              <td style="padding: 8px 0;"><strong>${meetingTypeDisplay}</strong></td>
                          </tr>
                      </table>
                  </div>
                  
                  <div class="video-link">
                      <h3 style="margin-top: 0; color: #0066cc;">🎥 Join Your Virtual Meeting</h3>
                      <p>When it's time for your appointment, click the link below:</p>
                      <a href="https://meet.google.com/appointment-${id}" class="btn">🎥 Join Virtual Showroom</a>
                      <p style="font-size: 12px; color: #666; margin-top: 15px;">
                          <strong>Note:</strong> Our furniture expert will call you 2-3 minutes before the scheduled time.
                      </p>
                  </div>
                  
                  <div class="next-steps">
                      <h3 style="margin-top: 0; color: #f59e0b;">📋 What to Expect</h3>
                      <ul style="padding-left: 20px;">
                          <li>Live virtual tour of our premium teak furniture showroom</li>
                          <li>Personalized recommendations based on your requirements</li>
                          <li>Real-time Q&A with our furniture experts</li>
                          <li>Exclusive offers and customization options</li>
                          <li>Professional guidance on furniture selection</li>
                      </ul>
                  </div>
                  
                  <h3 style="color: #8B4513;">📞 Need to Reschedule?</h3>
                  <p>If you need to change your appointment time, please contact us at least 2 hours in advance:</p>
                  <p>📞 <strong>Phone:</strong> +91 98765 43210<br>
                  📧 <strong>Email:</strong> appointments@indosaga.com<br>
                  💬 <strong>WhatsApp:</strong> +91 98765 43210</p>
              </div>
              
              <div class="footer">
                  <p><strong>IndoSaga Furniture</strong><br>
                  Premium Teak Wood Furniture<br>
                  📍 123 Furniture Street, Mumbai, India<br>
                  📞 +91 98765 43210 | 📧 info@indosaga.com</p>
                  
                  <p style="margin-top: 15px;">We look forward to showing you our beautiful furniture collection!</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
Virtual Meeting Confirmed - IndoSaga Furniture

Dear ${customerName},

Your virtual furniture consultation has been confirmed!

Meeting Details:
- Meeting ID: ${id}
- Date: ${formattedDate}
- Time: ${appointmentTime} IST
- Type: ${meetingTypeDisplay}

Join your virtual meeting: https://meet.google.com/appointment-${id}

What to Expect:
- Live virtual tour of our premium teak furniture showroom
- Personalized recommendations based on your requirements
- Real-time Q&A with our furniture experts
- Exclusive offers and customization options

Need to reschedule? Contact us at +91 98765 43210

Thank you for choosing IndoSaga Furniture!

IndoSaga Furniture
Premium Teak Wood Furniture
📍 123 Furniture Street, Mumbai, India
📞 +91 98765 43210 | 📧 info@indosaga.com
    `
  };
}

export function createUserOrderConfirmation(orderData: any): MailDataRequired {
  const { id: orderId, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, total, orderItems, razorpayPaymentId, paymentStatus } = orderData;
  
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const paymentMethodMap: Record<string, string> = {
    'card': 'Credit/Debit Card',
    'upi': 'UPI Payment',
    'netbanking': 'Net Banking',
    'wallet': 'Digital Wallet',
    'cod': 'Cash on Delivery',
    'qr': 'QR Code Payment'
  };
  const paymentMethodDisplay = paymentMethodMap[paymentMethod] || paymentMethod;

  const productList = orderItems?.map((item: any) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #ddd;">${item.product?.name || 'Product'}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">₹${parseFloat(item.price || "0").toLocaleString('en-IN')}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">₹${(parseFloat(item.price || "0") * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('') || '';

  return {
    to: customerEmail,
    from: {
      email: EMAIL_TEMPLATES.FROM_EMAIL,
      name: EMAIL_TEMPLATES.FROM_NAME
    },
    subject: `🎉 Order Confirmed - IndoSaga Furniture #${orderId.slice(-8)}`,
    html: `
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
              .order-details { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .products-table th, .products-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              .products-table th { background-color: #f5f5f5; font-weight: bold; color: #8B4513; }
              .total-section { background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
              .delivery-info { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .logo { font-size: 24px; font-weight: bold; }
              .success-badge { background-color: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin: 10px 0; }
              .total-amount { font-size: 32px; font-weight: bold; color: #8B4513; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">🪑 IndoSaga Furniture</div>
                  <h1 style="margin: 10px 0;">🎉 Order Confirmed!</h1>
                  <p>Thank you for your purchase of premium teak furniture</p>
              </div>
              
              <div class="content">
                  <p>Dear ${customerName},</p>
                  
                  <div style="text-align: center; margin: 20px 0;">
                      <div class="success-badge">✅ ORDER SUCCESSFULLY PLACED</div>
                  </div>
                  
                  <p>We're delighted to confirm that your order has been successfully placed! Thank you for choosing IndoSaga Furniture for your premium teak wood furniture needs.</p>
                  
                  <div class="order-details">
                      <h3 style="margin-top: 0; color: #22c55e;">📋 Order Information</h3>
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
                                  <span style="background-color: ${paymentStatus === 'paid' ? '#22c55e' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                                      ${paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
                                  </span>
                              </td>
                          </tr>
                          ${razorpayPaymentId ? `
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment ID:</td>
                              <td style="padding: 8px 0;">${razorpayPaymentId}</td>
                          </tr>
                          ` : ''}
                      </table>
                  </div>
                  
                  ${orderItems && orderItems.length > 0 ? `
                  <h3 style="color: #8B4513;">📦 Your Order Items</h3>
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
                      <div class="total-amount">₹${parseFloat(total || "0").toLocaleString('en-IN')}</div>
                      <p style="font-size: 12px; color: #666; margin-top: 10px;">*Inclusive of all taxes. Free delivery across India</p>
                  </div>
                  
                  <div class="delivery-info">
                      <h3 style="margin-top: 0; color: #f59e0b;">🚚 Delivery Information</h3>
                      <p><strong>Delivery Address:</strong><br>${shippingAddress || 'Address not provided'}</p>
                      <p><strong>Expected Delivery:</strong> 7-14 business days</p>
                      <p><strong>Delivery Status:</strong> You'll receive tracking information via SMS and email</p>
                  </div>
                  
                  <h3 style="color: #8B4513;">📞 What's Next?</h3>
                  <ul style="padding-left: 20px;">
                      <li><strong>Order Processing:</strong> Your order is being prepared with care by our craftsmen</li>
                      <li><strong>Quality Check:</strong> Each piece undergoes rigorous quality inspection</li>
                      <li><strong>Delivery Updates:</strong> You'll receive tracking information via SMS and email</li>
                      <li><strong>Assembly Service:</strong> Our team will help with professional assembly at your location</li>
                  </ul>
                  
                  <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <h4 style="margin-top: 0; color: #8B4513;">🌿 Premium Teak Wood Care</h4>
                      <p style="margin-bottom: 0; font-size: 14px;">Your furniture comes with a detailed care guide to maintain its beauty for generations. Regular dusting and occasional oiling will keep the natural teak finish lustrous.</p>
                  </div>
                  
                  <h3 style="color: #8B4513;">📞 Need Help?</h3>
                  <p>Our customer service team is here to assist you:</p>
                  <p>📞 <strong>Phone:</strong> +91 98765 43210 (9 AM - 7 PM IST)<br>
                  📧 <strong>Email:</strong> orders@indosaga.com<br>
                  💬 <strong>WhatsApp:</strong> +91 98765 43210</p>
              </div>
              
              <div class="footer">
                  <p><strong>IndoSaga Furniture</strong><br>
                  Premium Teak Wood Furniture<br>
                  📍 123 Furniture Street, Mumbai, India<br>
                  📞 +91 98765 43210 | 📧 info@indosaga.com</p>
                  
                  <p style="margin-top: 15px;">Thank you for choosing IndoSaga Furniture for your home furnishing needs!</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
Order Confirmed - IndoSaga Furniture

Dear ${customerName},

Your order has been successfully confirmed!

Order Details:
- Order ID: #${orderId}
- Order Date: ${currentDate}
- Payment Method: ${paymentMethodDisplay}
- Payment Status: ${paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
${razorpayPaymentId ? `- Payment ID: ${razorpayPaymentId}` : ''}

Order Total: ₹${parseFloat(total || "0").toLocaleString('en-IN')}

Delivery Address: ${shippingAddress || 'Address not provided'}
Expected Delivery: 7-14 business days

What's Next:
1. Order Processing: Your order is being prepared with care
2. Quality Check: Each piece undergoes rigorous inspection
3. Delivery Updates: You'll receive tracking information
4. Assembly Service: Professional assembly at your location

Need Help?
Phone: +91 98765 43210 (9 AM - 7 PM IST)
Email: orders@indosaga.com
WhatsApp: +91 98765 43210

Thank you for choosing IndoSaga Furniture!

IndoSaga Furniture
Premium Teak Wood Furniture
📍 123 Furniture Street, Mumbai, India
📞 +91 98765 43210 | 📧 info@indosaga.com
    `
  };
}