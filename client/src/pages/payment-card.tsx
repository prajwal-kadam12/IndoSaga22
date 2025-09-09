import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, CheckCircle, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function CardPaymentPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressData, setAddressData] = useState<any>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>("");

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["/api/cart"],
  });

  const total = (cartItems as any[]).reduce((sum: number, item: any) => 
    sum + (parseFloat(item.product?.price || "0") * item.quantity), 0
  );
  const shipping = 0; // Free shipping on all orders
  const finalTotal = total;

  useEffect(() => {
    const stored = localStorage.getItem('checkoutAddress');
    if (stored) {
      setAddressData(JSON.parse(stored));
    } else {
      navigate('/address');
    }

    // Fetch Razorpay configuration
    fetch('/api/payment/config')
      .then(res => res.json())
      .then(config => {
        if (config.key) {
          setRazorpayKey(config.key);
        }
      })
      .catch(console.error);
  }, [navigate]);

  const processCardPayment = async () => {
    setIsProcessing(true);

    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: finalTotal,
          currency: 'INR',
          receipt: `card_${Date.now()}`,
        }),
      });

      const razorpayOrder = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(razorpayOrder.message || 'Failed to create payment order');
      }

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'IndoSaga Furniture',
        description: 'Purchase of premium teak furniture',
        order_id: razorpayOrder.id,
        method: {
          card: true,
          netbanking: false,
          wallet: false,
          upi: false,
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/verify-razorpay-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(response),
            });

            const verificationResult = await verifyResponse.json();
            
            if (!verificationResult.success) {
              throw new Error('Payment verification failed');
            }

            // Create final order
            const orderData = {
              customerName: addressData.customerName || 'Customer',
              customerPhone: addressData.customerPhone || '0000000000',
              customerEmail: addressData.customerEmail || '',
              shippingAddress: addressData.shippingAddress || '',
              pincode: addressData.pincode || '000000',
              paymentMethod: 'card',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderItems: (cartItems as any[]).map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.product?.price || "0",
              })),
              total: finalTotal,
            };

            const finalOrderResponse = await fetch('/api/orders/direct-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(orderData),
            });

            const order = await finalOrderResponse.json();
            navigate(`/payment/success?orderId=${order.id}`);
          } catch (error) {
            console.error('Payment processing error:', error);
            toast({
              title: "Payment Processing Failed",
              description: "There was an error processing your payment. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: addressData?.customerName || 'Customer',
          email: addressData?.customerEmail || '',
          contact: addressData?.customerPhone || '0000000000',
        },
        notes: {
          address: addressData?.shippingAddress || '',
          payment_method: 'card',
        },
        theme: {
          color: '#8B4513',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Card payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process card payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (isLoading || !addressData) {
    return (
      <div className="py-20 bg-warmWhite min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8 mx-auto" />
            <div className="bg-gray-200 rounded-lg h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20 bg-warmWhite min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/payment')}
            className="mb-6 p-0 text-gray-600 hover:text-gray-800"
            data-testid="button-back-payment"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payment Options
          </Button>
          
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-4xl font-display font-bold text-darkBrown mb-4">
              Card Payment
            </h1>
            <p className="text-lg text-gray-600">
              Pay securely using your Credit/Debit card
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Secure Card Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Security Features */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Shield className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900">Secure Payment</span>
                    </div>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 256-bit SSL encryption</li>
                      <li>• PCI DSS compliant</li>
                      <li>• Card details never stored</li>
                      <li>• 3D Secure authentication</li>
                    </ul>
                  </div>

                  {/* Supported Cards */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Accepted Cards</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { name: 'Visa', color: 'bg-blue-600' },
                        { name: 'Mastercard', color: 'bg-red-600' },
                        { name: 'RuPay', color: 'bg-green-600' },
                        { name: 'Amex', color: 'bg-blue-800' }
                      ].map((card) => (
                        <div key={card.name} className="text-center p-3 border rounded-lg">
                          <div className={`w-8 h-5 ${card.color} rounded mx-auto mb-2`}></div>
                          <p className="text-sm font-medium">{card.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">Secure Card Entry</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Click "Pay Now" to enter your card details in a secure Razorpay form
                      </p>
                    </div>

                    <Button
                      onClick={processCardPayment}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                      data-testid="button-pay-card"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Opening Secure Payment...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Pay ₹{finalTotal.toLocaleString('en-IN')} Securely
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Additional Info */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Your card information is processed securely by Razorpay</p>
                    <p>• IndoSaga Furniture never sees or stores your card details</p>
                    <p>• You may be redirected to your bank for additional verification</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-white">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{finalTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">Secure Payment</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Your payment is secured by Razorpay
                    </p>
                  </div>

                  {/* Trust Badges */}
                  <div className="mt-6 text-center">
                    <div className="flex justify-center items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Trusted by 10M+ users</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="bg-gray-50 p-2 rounded">SSL Secured</div>
                      <div className="bg-gray-50 p-2 rounded">PCI Compliant</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}