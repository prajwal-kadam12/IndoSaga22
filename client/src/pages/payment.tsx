import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Smartphone, QrCode, Banknote, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import RazorpayPaymentModal from "@/components/razorpay-payment-modal";

export default function PaymentPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const [addressData, setAddressData] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [razorpayKey, setRazorpayKey] = useState<string>("");
  const [isDirectCheckout, setIsDirectCheckout] = useState(false);
  const [isCartCheckout, setIsCartCheckout] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<any>(null);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(true);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["/api/cart"],
    enabled: !isDirectCheckout && !isCartCheckout
  });

  // Helper function to safely map items for checkout
  const mapOrderItems = (items: any[]) => {
    if (isDirectCheckout) {
      return items.map((item: any) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price.toString(),
      }));
    } else if (isCartCheckout) {
      return items.map((item: any) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price.toString(),
      }));
    } else {
      return items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product?.price || "0",
      }));
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('checkoutAddress');
    if (stored) {
      setAddressData(JSON.parse(stored));
    } else {
      navigate('/address');
    }

    // Check if this is direct checkout or cart checkout
    const checkoutType = localStorage.getItem('checkoutType');
    const buyNowData = localStorage.getItem('buyNowItem');
    const cartData = localStorage.getItem('checkoutItems');
    
    if (checkoutType === 'direct' && buyNowData) {
      setIsDirectCheckout(true);
      setBuyNowItem(JSON.parse(buyNowData));
    } else if (checkoutType === 'cart' && cartData) {
      setIsCartCheckout(true);
      setCheckoutItems(JSON.parse(cartData));
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

  // Calculate totals based on checkout type
  const items = isDirectCheckout ? [buyNowItem] : 
                isCartCheckout ? checkoutItems : 
                (cartItems as any[]);
  const total = isDirectCheckout && buyNowItem ? 
    buyNowItem.total : 
    isCartCheckout ? 
      checkoutItems.reduce((sum: number, item: any) => sum + item.total, 0) :
      (cartItems as any[]).reduce((sum: number, item: any) => 
        sum + (parseFloat(item.product?.price || "0") * item.quantity), 0
    );
  const shipping = 0; // Free shipping on all orders
  const finalTotal = total;

  const paymentMethods = [
    {
      id: "upi",
      name: "UPI Payment",
      description: "Pay using any UPI app like GPay, PhonePe, Paytm",
      icon: Smartphone,
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Visa, Mastercard, RuPay cards accepted",
      icon: CreditCard,
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600"
    },
    {
      id: "qr",
      name: "QR Code Payment",
      description: "Scan QR code with any UPI app",
      icon: QrCode,
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay when your order is delivered",
      icon: Banknote,
      color: "bg-orange-50 border-orange-200",
      iconColor: "text-orange-600"
    }
  ];

  const processPayment = async (method: string) => {
    if (!addressData) {
      toast({
        title: "Missing Information",
        description: "Please provide your address details first.",
        variant: "destructive",
      });
      navigate('/address');
      return;
    }

    try {
      setSelectedMethod(method);
      
      if (method === 'cod') {
        // Handle Cash on Delivery
        const orderData = {
          customerName: addressData.customerName || 'Customer',
          customerPhone: addressData.customerPhone || '0000000000',
          customerEmail: addressData.customerEmail || '',
          shippingAddress: addressData.shippingAddress || '',
          pincode: addressData.pincode || '000000',
          paymentMethod: 'cod',
          orderItems: mapOrderItems(items),
          total: finalTotal,
        };

        const endpoint = isDirectCheckout ? '/api/orders/direct-checkout' : '/api/orders/checkout';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: isDirectCheckout ? 'omit' : 'include',
          body: JSON.stringify(orderData),
        });
        const order = await response.json();
        navigate(`/payment/success?orderId=${order.id}`);
        return;
      }

      // Handle online payments with Razorpay
      const { createRazorpayOrder, verifyPayment, createFinalOrder, initializeRazorpay } = await import('@/lib/razorpay');
      
      const razorpayOrder = await createRazorpayOrder(finalTotal, addressData);
      
      const options = {
        key: razorpayKey || 'rzp_test_key',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'IndoSaga Furniture',
        description: 'Purchase of premium teak furniture',
        order_id: razorpayOrder.id,
        handler: async (response: any) => {
          try {
            await verifyPayment(response);
            
            const orderData = {
              customerName: addressData.customerName || 'Customer',
              customerPhone: addressData.customerPhone || '0000000000',
              customerEmail: addressData.customerEmail || '',
              shippingAddress: addressData.shippingAddress || '',
              pincode: addressData.pincode || '000000',
              paymentMethod: method,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderItems: mapOrderItems(items),
              total: finalTotal,
            };

            const endpoint = isDirectCheckout ? '/api/orders/direct-checkout' : '/api/orders/checkout';
            const orderResponse = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: isDirectCheckout ? 'omit' : 'include',
              body: JSON.stringify(orderData),
            });
            const order = await orderResponse.json();
            navigate(`/payment/success?orderId=${order.id}`);
          } catch (error) {
            toast({
              title: "Payment Processing Failed",
              description: "There was an error processing your payment. Please try again.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: addressData.customerName || 'Customer',
          email: addressData.customerEmail || '',
          contact: addressData.customerPhone || '0000000000',
        },
        notes: {
          address: addressData.shippingAddress || '',
        },
        theme: {
          color: '#8B4513',
        },
      };

      await initializeRazorpay(options);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    processPayment(method);
  };

  if (isLoading || !addressData) {
    return (
      <div className="py-20 bg-warmWhite min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8 mx-auto" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-20 bg-warmWhite min-h-screen">
      <RazorpayPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          navigate('/address');
        }}
        onSelectMethod={handlePaymentMethodSelect}
        total={finalTotal}
        phoneNumber={addressData?.customerPhone?.slice(-10)}
      />
    </div>
  );
}