// Razorpay integration utility
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    address: string;
  };
  theme: {
    color: string;
  };
}

export const createRazorpayOrder = async (amount: number, customerDetails: any) => {
  try {
    const response = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment order');
    }

    const orderData = await response.json();
    return orderData;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentData: any) => {
  try {
    const response = await fetch('/api/verify-razorpay-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error('Payment verification failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

export const createFinalOrder = async (orderData: any) => {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create final order');
    }

    const order = await response.json();
    return order;
  } catch (error) {
    console.error('Error creating final order:', error);
    throw error;
  }
};

// Get payment configuration from server
export const getPaymentConfig = async () => {
  try {
    const response = await fetch('/api/payment/config', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payment config');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching payment config:', error);
    throw error;
  }
};

export const initializeRazorpay = (options: RazorpayOptions) => {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded'));
      return;
    }

    const rzp = new window.Razorpay({
      ...options,
      modal: {
        ondismiss: () => {
          reject(new Error('Payment cancelled by user'));
        },
      },
    });

    rzp.on('payment.failed', (response: any) => {
      reject(new Error(`Payment failed: ${response.error.description}`));
    });

    rzp.open();
    resolve(rzp);
  });
};