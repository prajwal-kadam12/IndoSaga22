// Email Automation Service for IndoSaga Furniture
// Handles automated email sending for user actions

import { 
  sendMeetingBookingEmails, 
  sendOrderConfirmationEmails,
  checkEmailRateLimit,
  logEmailDelivery,
  type EmailDeliveryStatus 
} from './email-service';

// Email automation triggers
export enum EmailTrigger {
  MEETING_BOOKING = 'meeting_booking',
  ORDER_COMPLETION = 'order_completion',
  CONTACT_INQUIRY = 'contact_inquiry'
}

// Email automation configuration
export interface EmailAutomationConfig {
  enabled: boolean;
  retryAttempts: number;
  retryDelay: number; // milliseconds
  logDelivery: boolean;
}

const DEFAULT_CONFIG: EmailAutomationConfig = {
  enabled: true,
  retryAttempts: 3,
  retryDelay: 1000,
  logDelivery: true
};

// Main email automation class
export class EmailAutomationService {
  private config: EmailAutomationConfig;
  
  constructor(config: Partial<EmailAutomationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // Process meeting booking automation
  async processMeetingBooking(meetingData: any): Promise<EmailDeliveryStatus> {
    const startTime = new Date();
    const errors: string[] = [];
    
    try {
      // Validate required fields
      if (!meetingData.customerEmail || !meetingData.customerName) {
        throw new Error('Missing required customer information');
      }
      
      // Check rate limiting
      if (!checkEmailRateLimit(meetingData.customerEmail)) {
        throw new Error('Email rate limit exceeded');
      }
      
      // Send emails with retry logic
      const results = await this.sendWithRetry(
        () => sendMeetingBookingEmails(meetingData),
        'meeting booking'
      );
      
      const status: EmailDeliveryStatus = {
        userEmailSent: results.userSent,
        adminEmailSent: results.adminSent,
        timestamp: startTime,
        errors: results.userSent && results.adminSent ? undefined : ['Some emails failed to send']
      };
      
      if (this.config.logDelivery) {
        logEmailDelivery(EmailTrigger.MEETING_BOOKING, meetingData.id, status);
      }
      
      return status;
    } catch (error: any) {
      const status: EmailDeliveryStatus = {
        userEmailSent: false,
        adminEmailSent: false,
        timestamp: startTime,
        errors: [error.message]
      };
      
      if (this.config.logDelivery) {
        logEmailDelivery(EmailTrigger.MEETING_BOOKING, meetingData.id || 'unknown', status);
      }
      
      return status;
    }
  }
  
  // Process order completion automation
  async processOrderCompletion(orderData: any): Promise<EmailDeliveryStatus> {
    const startTime = new Date();
    
    try {
      // Validate required fields
      if (!orderData.customerEmail || !orderData.customerName) {
        throw new Error('Missing required customer information');
      }
      
      // Check rate limiting
      if (!checkEmailRateLimit(orderData.customerEmail)) {
        throw new Error('Email rate limit exceeded');
      }
      
      // Send emails with retry logic
      const results = await this.sendWithRetry(
        () => sendOrderConfirmationEmails(orderData),
        'order confirmation'
      );
      
      const status: EmailDeliveryStatus = {
        userEmailSent: results.userSent,
        adminEmailSent: results.adminSent,
        timestamp: startTime,
        errors: results.userSent && results.adminSent ? undefined : ['Some emails failed to send']
      };
      
      if (this.config.logDelivery) {
        logEmailDelivery(EmailTrigger.ORDER_COMPLETION, orderData.id, status);
      }
      
      return status;
    } catch (error: any) {
      const status: EmailDeliveryStatus = {
        userEmailSent: false,
        adminEmailSent: false,
        timestamp: startTime,
        errors: [error.message]
      };
      
      if (this.config.logDelivery) {
        logEmailDelivery(EmailTrigger.ORDER_COMPLETION, orderData.id || 'unknown', status);
      }
      
      return status;
    }
  }
  
  // Retry logic for email sending
  private async sendWithRetry(
    emailFunction: () => Promise<{ userSent: boolean; adminSent: boolean }>,
    context: string
  ): Promise<{ userSent: boolean; adminSent: boolean }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`📧 Sending ${context} emails (attempt ${attempt}/${this.config.retryAttempts})`);
        const results = await emailFunction();
        
        if (results.userSent && results.adminSent) {
          console.log(`✅ All ${context} emails sent successfully on attempt ${attempt}`);
          return results;
        } else if (attempt === this.config.retryAttempts) {
          // Last attempt, return partial results
          console.log(`⚠️  Partial success for ${context} emails on final attempt`);
          return results;
        } else {
          // Retry for partial failures
          console.log(`⚠️  Partial failure for ${context} emails, retrying...`);
          await this.delay(this.config.retryDelay * attempt);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed for ${context} emails:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    // All attempts failed
    throw lastError || new Error(`Failed to send ${context} emails after ${this.config.retryAttempts} attempts`);
  }
  
  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Get automation statistics
  getStats(): any {
    return {
      config: this.config,
      rateLimitInfo: {
        windowSize: '1 minute',
        maxEmailsPerWindow: 5,
        description: 'Prevents spam and abuse'
      },
      supportedTriggers: Object.values(EmailTrigger),
      features: [
        'Dual email sending (user + admin)',
        'Automatic retry with exponential backoff',
        'Rate limiting protection',
        'Comprehensive error handling',
        'Delivery status tracking',
        'GDPR compliant transactional emails'
      ]
    };
  }
}

// Global email automation instance
export const emailAutomation = new EmailAutomationService();

// Convenience functions for direct use
export async function automateBookingEmails(meetingData: any): Promise<EmailDeliveryStatus> {
  return await emailAutomation.processMeetingBooking(meetingData);
}

export async function automateOrderEmails(orderData: any): Promise<EmailDeliveryStatus> {
  return await emailAutomation.processOrderCompletion(orderData);
}