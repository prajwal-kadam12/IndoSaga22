import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Smartphone, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function UPIPaymentPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const [upiId, setUpiId] = useState("");
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

  const validateUpiId = (upiId: string) => {
    // UPI ID validation regex
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(upiId);
  };

  const processUPIPayment = async () => {
    if (!validateUpiId(upiId)) {
      toast({
        title: "Invalid UPI ID",
        description: "Please enter a valid UPI ID (e.g., user@paytm)",
        variant: "destructive",
      });
      return;
    }

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
          receipt: `upi_${Date.now()}`,
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
          upi: {
            vpa: upiId
          }
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
              paymentMethod: 'upi',
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
          upi_id: upiId,
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
      console.error('UPI payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process UPI payment. Please try again.",
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
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            
            <h1 className="text-4xl font-display font-bold text-darkBrown mb-4">
              UPI Payment
            </h1>
            <p className="text-lg text-gray-600">
              Enter your UPI ID to complete the payment
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="flex items-center">
                  <Smartphone className="w-5 h-5 mr-2" />
                  UPI Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="upiId" className="text-base font-medium">
                      UPI ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="upiId"
                      type="text"
                      placeholder="yourname@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="mt-2 text-lg py-3"
                      data-testid="input-upi-id"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Enter your UPI ID (e.g., user@paytm, user@phonepe, user@googlepay)
                    </p>
                  </div>

                  {/* Supported UPI Apps */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Supported UPI Apps</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                        <div key={app} className="text-center p-3 border rounded-lg">
                          <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                          <p className="text-sm font-medium">{app}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={processUPIPayment}
                    disabled={isProcessing || !upiId}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
                    data-testid="button-pay-upi"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        Pay ₹{finalTotal.toLocaleString('en-IN')}
                      </>
                    )}
                  </Button>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}