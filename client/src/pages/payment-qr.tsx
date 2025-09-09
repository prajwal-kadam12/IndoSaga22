import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, QrCode, CheckCircle, Loader2, Smartphone, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function QRPaymentPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [orderId, setOrderId] = useState<string>("");
  const [addressData, setAddressData] = useState<any>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>("");
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

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

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [navigate]);

  const generateQRCode = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: finalTotal,
          currency: 'INR',
          receipt: `qr_${Date.now()}`,
        }),
      });

      const razorpayOrder = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(razorpayOrder.message || 'Failed to create payment order');
      }

      setOrderId(razorpayOrder.id);

      // Open Razorpay QR Code modal
      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'IndoSaga Furniture',
        description: 'Purchase of premium teak furniture',
        order_id: razorpayOrder.id,
        method: {
          qr: true
        },
        handler: async (response: any) => {
          try {
            setPaymentStatus('success');
            
            // Verify payment
            const verifyResponse = await fetch('/api/payment/verify', {
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
              paymentMethod: 'qr',
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
            setPaymentStatus('failed');
            toast({
              title: "Payment Processing Failed",
              description: "There was an error processing your payment. Please try again.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: addressData?.customerName || 'Customer',
          email: addressData?.customerEmail || '',
          contact: addressData?.customerPhone || '0000000000',
        },
        notes: {
          address: addressData?.shippingAddress || '',
          payment_method: 'qr',
        },
        theme: {
          color: '#8B4513',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setPaymentStatus('pending');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
      setIsProcessing(false);
    } catch (error) {
      console.error('QR payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to generate QR code. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setPaymentStatus('failed');
    }
  };

  const retryPayment = () => {
    setPaymentStatus('pending');
    setOrderId('');
    setQrCodeUrl('');
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
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <QrCode className="w-8 h-8 text-purple-600" />
            </div>
            
            <h1 className="text-4xl font-display font-bold text-darkBrown mb-4">
              QR Code Payment
            </h1>
            <p className="text-lg text-gray-600">
              Scan the QR code with any UPI app to complete payment
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* QR Code Section */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <CardTitle className="flex items-center">
                  <QrCode className="w-5 h-5 mr-2" />
                  QR Code Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  {paymentStatus === 'pending' && (
                    <div className="space-y-6">
                      <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-gray-400" />
                      </div>
                      <Button
                        onClick={generateQRCode}
                        disabled={isProcessing}
                        className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-3"
                        data-testid="button-generate-qr"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating QR Code...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-2" />
                            Generate QR Code
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {paymentStatus === 'processing' && (
                    <div className="space-y-6">
                      <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                          <p className="text-purple-600 font-medium">QR Code Ready</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Scan QR Code to Pay ₹{finalTotal.toLocaleString('en-IN')}
                        </h3>
                        <p className="text-gray-600">
                          Open any UPI app and scan the QR code to complete your payment
                        </p>
                        <div className="flex justify-center space-x-4 text-sm text-gray-500">
                          <span>• GPay</span>
                          <span>• PhonePe</span>
                          <span>• Paytm</span>
                          <span>• BHIM</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'success' && (
                    <div className="space-y-6">
                      <div className="w-64 h-64 mx-auto bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-24 h-24 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
                        <p className="text-green-600">Redirecting to confirmation page...</p>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'failed' && (
                    <div className="space-y-6">
                      <div className="w-64 h-64 mx-auto bg-red-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-red-800">Payment Failed</h3>
                        <p className="text-red-600 mb-4">There was an issue processing your payment</p>
                        <Button
                          onClick={retryPayment}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          data-testid="button-retry-payment"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How to scan QR code:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                    <li>2. Tap on "Scan & Pay" or QR scanner</li>
                    <li>3. Point your camera at the QR code above</li>
                    <li>4. Enter your UPI PIN to complete payment</li>
                  </ol>
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

                  {orderId && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Order ID:</p>
                      <p className="text-xs font-mono text-gray-800">{orderId}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}