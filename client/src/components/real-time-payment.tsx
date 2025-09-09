import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, CreditCard, Smartphone, Building, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createRazorpayOrder, verifyPayment } from '@/lib/razorpay';

interface RealTimePaymentProps {
  amount: number;
  customerDetails: {
    name: string;
    email: string;
    contact: string;
    address: string;
  };
  orderItems: any[];
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentFailure: (error: string) => void;
  onCancel: () => void;
}

export default function RealTimePayment({ 
  amount, 
  customerDetails, 
  orderItems,
  onPaymentSuccess, 
  onPaymentFailure,
  onCancel 
}: RealTimePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'creating' | 'processing' | 'verifying' | 'success' | 'failed'>('idle');
  const [razorpayConfig, setRazorpayConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch Razorpay configuration
    fetch('/api/payment/config')
      .then(res => res.json())
      .then(config => {
        setRazorpayConfig(config);
        if (!config.enabled) {
          toast({
            title: "Payment Service Unavailable",
            description: "Payment service is not configured. Please try again later.",
            variant: "destructive",
          });
        }
      })
      .catch(err => {
        console.error('Failed to load payment config:', err);
        toast({
          title: "Configuration Error",
          description: "Failed to load payment configuration.",
          variant: "destructive",
        });
      });
  }, [toast]);

  const handlePayment = async (method: 'card' | 'upi' | 'netbanking') => {
    if (!razorpayConfig?.enabled) {
      toast({
        title: "Payment Unavailable",
        description: "Payment service is not configured.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('creating');

    try {
      // Create Razorpay order
      const razorpayOrder = await createRazorpayOrder(amount, customerDetails);
      console.log('Razorpay order created:', razorpayOrder);

      setPaymentStatus('processing');

      // Wait for Razorpay SDK to load
      const Razorpay = await (window as any).razorpayLoaded;
      
      if (!Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      const options = {
        key: razorpayConfig.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'IndoSaga Furniture',
        description: 'Premium Teak Wood Furniture',
        order_id: razorpayOrder.id,
        prefill: {
          name: customerDetails.name,
          email: customerDetails.email,
          contact: customerDetails.contact,
        },
        notes: {
          address: customerDetails.address,
          items: JSON.stringify(orderItems.map(item => ({
            name: item.product?.name || 'Product',
            quantity: item.quantity,
            price: item.price
          })))
        },
        theme: {
          color: '#dc2626' // Red theme matching IndoSaga
        },
        method: {
          card: method === 'card',
          upi: method === 'upi',
          netbanking: method === 'netbanking',
          wallet: false,
        },
        handler: async (response: any) => {
          console.log('Payment response:', response);
          setPaymentStatus('verifying');
          
          try {
            // Verify payment with backend
            const verificationResult = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verificationResult.success) {
              setPaymentStatus('success');
              toast({
                title: "Payment Successful!",
                description: "Your order has been confirmed.",
                variant: "default",
              });
              
              onPaymentSuccess({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentMethod: method,
                paymentStatus: 'paid',
                amount: amount
              });
            } else {
              throw new Error(verificationResult.message || 'Payment verification failed');
            }
          } catch (verifyError: any) {
            console.error('Payment verification failed:', verifyError);
            setPaymentStatus('failed');
            toast({
              title: "Payment Verification Failed",
              description: verifyError.message || "Please contact support.",
              variant: "destructive",
            });
            onPaymentFailure(verifyError.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setPaymentStatus('idle');
            setIsProcessing(false);
            onCancel();
          }
        }
      };

      const razorpayInstance = new Razorpay(options);
      
      razorpayInstance.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        setPaymentStatus('failed');
        setIsProcessing(false);
        toast({
          title: "Payment Failed",
          description: response.error.description || "Payment could not be processed.",
          variant: "destructive",
        });
        onPaymentFailure(response.error.description || 'Payment failed');
      });

      razorpayInstance.open();

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      setPaymentStatus('failed');
      setIsProcessing(false);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment.",
        variant: "destructive",
      });
      onPaymentFailure(error.message || 'Payment initiation failed');
    }
  };

  const handleCOD = () => {
    toast({
      title: "COD Order Confirmed",
      description: "Your order will be delivered. Pay when you receive it.",
      variant: "default",
    });
    
    onPaymentSuccess({
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      amount: amount // No COD fee
    });
  };

  return (
    <Card className="w-full rounded-2xl shadow-2xl border-0 bg-gradient-to-br from-white via-warmWhite to-white">
      <CardHeader className="text-center p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <CardTitle className="flex items-center justify-center gap-2 text-xl text-darkBrown font-display">
          {paymentStatus === 'success' ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : paymentStatus === 'failed' ? (
            <XCircle className="h-6 w-6 text-red-600" />
          ) : (
            <CreditCard className="h-6 w-6 text-primary" />
          )}
          Choose Payment Method
        </CardTitle>
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl">
          <div className="text-2xl font-bold text-primary">₹{amount.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Amount</div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">

        {paymentStatus === 'idle' && (
          <div className="space-y-3">
            {/* UPI Payment */}
            <Button
              onClick={() => handlePayment('upi')}
              disabled={isProcessing || !razorpayConfig?.enabled}
              className="w-full h-14 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-xl text-left transition-all duration-300"
              variant="ghost"
              data-testid="button-pay-upi"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-darkBrown">UPI Payment</div>
                  <div className="text-sm text-gray-600">PhonePe, GooglePay, Paytm</div>
                </div>
              </div>
              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Instant</div>
            </Button>

            {/* Credit/Debit Card */}
            <Button
              onClick={() => handlePayment('card')}
              disabled={isProcessing || !razorpayConfig?.enabled}
              className="w-full h-14 flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-xl text-left transition-all duration-300"
              variant="ghost"
              data-testid="button-pay-card"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-darkBrown">Credit/Debit Card</div>
                  <div className="text-sm text-gray-600">Visa, MasterCard, RuPay</div>
                </div>
              </div>
              <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Secure</div>
            </Button>

            {/* Net Banking */}
            <Button
              onClick={() => handlePayment('netbanking')}
              disabled={isProcessing || !razorpayConfig?.enabled}
              className="w-full h-14 flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 rounded-xl text-left transition-all duration-300"
              variant="ghost"
              data-testid="button-pay-netbanking"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-darkBrown">Net Banking</div>
                  <div className="text-sm text-gray-600">All major banks supported</div>
                </div>
              </div>
              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Trusted</div>
            </Button>

            {/* Cash on Delivery */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            
            <Button
              onClick={handleCOD}
              className="w-full h-14 flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-100 hover:from-orange-100 hover:to-amber-200 border border-orange-200 rounded-xl text-left transition-all duration-300"
              variant="ghost"
              data-testid="button-pay-cod"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-darkBrown">Cash on Delivery</div>
                  <div className="text-sm text-gray-600">Pay when you receive</div>
                </div>
              </div>
              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Free</div>
            </Button>
          </div>
        )}

        {paymentStatus !== 'idle' && paymentStatus !== 'success' && paymentStatus !== 'failed' && (
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <div className="text-sm text-gray-600">
              {paymentStatus === 'creating' && 'Creating payment order...'}
              {paymentStatus === 'processing' && 'Processing payment...'}
              {paymentStatus === 'verifying' && 'Verifying payment...'}
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center space-y-2">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div className="text-lg font-semibold text-green-700">Payment Successful!</div>
            <div className="text-sm text-gray-600">Your order is being processed.</div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center space-y-2">
            <XCircle className="h-12 w-12 text-red-600 mx-auto" />
            <div className="text-lg font-semibold text-red-700">Payment Failed</div>
            <div className="text-sm text-gray-600">Please try again or contact support.</div>
            <Button
              onClick={() => {
                setPaymentStatus('idle');
                setIsProcessing(false);
              }}
              className="mt-2 w-full h-12 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 text-white font-semibold shadow-lg rounded-xl"
            >
              Try Again
            </Button>
          </div>
        )}

        {!razorpayConfig?.enabled && (
          <div className="text-center text-sm text-gray-500 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            Payment service is currently unavailable. Please try again later.
          </div>
        )}
      </CardContent>
    </Card>
  );
}