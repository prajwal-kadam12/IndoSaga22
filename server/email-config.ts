// SendGrid Email Configuration and Setup Guide

export const SENDGRID_CONFIG = {
  // Environment Variables Required
  REQUIRED_ENV_VARS: {
    SENDGRID_API_KEY: 'Your SendGrid API key from SendGrid dashboard',
  },
  
  // Email Settings
  SETTINGS: {
    ADMIN_EMAIL: 'kadamprajwal358@gmail.com',
    FROM_EMAIL: 'noreply@indosaga.com',
    FROM_NAME: 'IndoSaga Furniture',
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    MAX_EMAILS_PER_WINDOW: 5,
  },
  
  // Email Types
  EMAIL_TYPES: {
    MEETING_BOOKING: 'meeting_booking',
    ORDER_CONFIRMATION: 'order_confirmation',
    CONTACT_INQUIRY: 'contact_inquiry',
  }
};

// SendGrid Setup Instructions
export const SETUP_INSTRUCTIONS = `
📧 SENDGRID EMAIL AUTOMATION SETUP GUIDE
═══════════════════════════════════════

1. CREATE SENDGRID ACCOUNT:
   - Go to https://sendgrid.com/
   - Sign up for a free account (100 emails/day free tier)
   - Verify your email address

2. GET API KEY:
   - Login to SendGrid dashboard
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Give permissions: Mail Send (Full Access)
   - Copy the generated API key

3. CONFIGURE ENVIRONMENT:
   - Add to your .env file:
     SENDGRID_API_KEY=your_api_key_here
   - Restart your application

4. VERIFY SENDER EMAIL:
   - Go to Settings > Sender Authentication
   - Verify your domain or single sender email
   - Use verified email as FROM_EMAIL in templates

5. TEST EMAIL DELIVERY:
   - Use the /api/test-emails endpoint (development only)
   - Check spam folders if emails don't arrive
   - Monitor SendGrid dashboard for delivery stats

6. PRODUCTION CONSIDERATIONS:
   - Upgrade SendGrid plan for higher volume
   - Set up dedicated IP for better deliverability
   - Configure DKIM and SPF records
   - Monitor bounce and spam rates

📊 EMAIL AUTOMATION FEATURES:
═══════════════════════════════════════

✅ Dual Email System:
   - User confirmation emails
   - Admin notification emails
   - Simultaneous sending

✅ Rate Limiting:
   - Prevents spam and abuse
   - 5 emails per minute per email address
   - Automatic cleanup of old entries

✅ Error Handling:
   - Graceful fallback if SendGrid fails
   - Detailed logging for debugging
   - Order processing continues even if emails fail

✅ Professional Templates:
   - HTML and text versions
   - Mobile-responsive design
   - Brand-consistent styling

✅ GDPR Compliance:
   - Transactional emails only
   - No marketing without consent
   - Clear unsubscribe options where required

📧 EMAIL TRIGGERS:
═══════════════════════════════════════

1. VIRTUAL MEETING BOOKING:
   Trigger: Form submission in appointment modal
   User Email: Meeting confirmation with details
   Admin Email: New booking notification with customer info

2. PURCHASE COMPLETION:
   Trigger: Any payment method selection and completion
   User Email: Order confirmation with receipt
   Admin Email: New order notification with processing instructions

📈 MONITORING & ANALYTICS:
═══════════════════════════════════════

- SendGrid Dashboard: Real-time delivery stats
- Server Logs: Detailed email sending logs
- Error Tracking: Failed email notifications
- Rate Limiting: Spam prevention monitoring

🔧 TESTING PROCEDURES:
═══════════════════════════════════════

1. Development Testing:
   - Use /api/test-emails endpoint
   - Check console logs for email content
   - Verify both user and admin emails

2. Production Testing:
   - Test with real email addresses
   - Check spam folders
   - Verify email formatting on different clients

3. Load Testing:
   - Test rate limiting functionality
   - Verify email queue handling
   - Monitor SendGrid quota usage
`;

// Email validation utilities
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeEmailContent(content: string): string {
  // Remove potentially harmful content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// Email delivery status tracking
export interface EmailDeliveryStatus {
  userEmailSent: boolean;
  adminEmailSent: boolean;
  timestamp: Date;
  errors?: string[];
}

export function logEmailDelivery(
  type: string, 
  identifier: string, 
  status: EmailDeliveryStatus
): void {
  console.log(`📧 Email Delivery Log [${type}] - ${identifier}:`, {
    userEmail: status.userEmailSent ? '✅ Sent' : '❌ Failed',
    adminEmail: status.adminEmailSent ? '✅ Sent' : '❌ Failed',
    timestamp: status.timestamp.toISOString(),
    errors: status.errors || []
  });
}