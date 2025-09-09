import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ShoppingBag, Truck, CreditCard, MapPin, User } from 'lucide-react';
import RealTimePayment from '@/components/real-time-payment';
import { createFinalOrder } from '@/lib/razorpay';

export default function CheckoutPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    contact: '',
    address: '',
    pincode: ''
  });

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment' | 'success'>('details');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [isDirectCheckout, setIsDirectCheckout] = useState(false);

  // Load cart items
  const { data: cartItems = [], isLoading: cartLoading } = useQuery({
    queryKey: ["/api/cart"],
    enabled: !isDirectCheckout
  });

  // Load user profile and redirect if not authenticated
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/login';
    }
  }, [user, userLoading]);

  // Create final order mutation
  const createOrderMutation = useMutation({
    mutationFn: createFinalOrder,
    onSuccess: (order) => {
      toast({
        title: "Order Created Successfully!",
        description: `Order #${order.id.slice(-8)} has been placed.`,
        variant: "default",
      });
      
      // Clear local storage and cart
      localStorage.removeItem('checkoutType');
      localStorage.removeItem('buyNowItem');
      localStorage.removeItem('checkoutItems');
      localStorage.removeItem('localCart'); // Clear local cart as well
      
      // Invalidate cart queries to refresh cart state
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      
      // Navigate to success page
      navigate(`/order-success?orderId=${order.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Order Creation Failed",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    // Check checkout type and load appropriate data - only once on mount
    const checkoutType = localStorage.getItem('checkoutType');
    const buyNowData = localStorage.getItem('buyNowItem');
    const cartData = localStorage.getItem('checkoutItems');

    if (checkoutType === 'direct' && buyNowData) {
      const item = JSON.parse(buyNowData);
      setIsDirectCheckout(true);
      setOrderItems([item]);
      setOrderTotal(item.total);
    } else if (checkoutType === 'cart' && cartData) {
      const items = JSON.parse(cartData);
      
      // Recalculate prices to apply deal prices
      const updatedItems = items.map((item: any) => {
        const now = new Date();
        const dealExpiry = item.product.dealExpiry ? new Date(item.product.dealExpiry) : null;
        const isValidDeal = item.product.isDeal && item.product.dealPrice && (!dealExpiry || dealExpiry > now);
        
        const effectivePrice = isValidDeal ? parseFloat(item.product.dealPrice) : parseFloat(item.product.price);
        
        return {
          ...item,
          price: effectivePrice,
          total: effectivePrice * item.quantity
        };
      });
      
      setOrderItems(updatedItems);
      setOrderTotal(updatedItems.reduce((sum: number, item: any) => sum + item.total, 0));
    }
    // Don't fall back to current cart items to prevent loops
  }, []); // Empty dependency array - run only on mount

  // Load cart items only when needed and no checkout data exists
  useEffect(() => {
    if (orderItems.length === 0 && !isDirectCheckout && Array.isArray(cartItems) && cartItems.length > 0) {
      const items = (cartItems as any[]).map((item: any) => {
        // Use deal price if product is on deal and deal hasn't expired
        const now = new Date();
        const dealExpiry = item.product.dealExpiry ? new Date(item.product.dealExpiry) : null;
        const isValidDeal = item.product.isDeal && item.product.dealPrice && (!dealExpiry || dealExpiry > now);
        
        const effectivePrice = isValidDeal ? parseFloat(item.product.dealPrice) : parseFloat(item.product.price);
        
        return {
          product: item.product,
          quantity: item.quantity,
          price: effectivePrice,
          total: effectivePrice * item.quantity
        };
      });
      setOrderItems(items);
      setOrderTotal(items.reduce((sum: number, item: any) => sum + item.total, 0));
    }
  }, [cartItems, orderItems.length, isDirectCheckout]);

  // User details effect - only run when user changes and fields are empty
  useEffect(() => {
    if (user && typeof user === 'object' && (!customerDetails.name || !customerDetails.email)) {
      const userObj = user as any;
      setCustomerDetails(prev => ({
        ...prev,
        name: prev.name || userObj.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim(),
        email: prev.email || userObj.email || '',
      }));
    }
  }, [user, customerDetails.name, customerDetails.email]); // Only depend on user and empty fields

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!customerDetails.name || !customerDetails.contact || !customerDetails.address || !customerDetails.pincode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutStep('payment');
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    const orderData = {
      orderItems: orderItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price.toString()
      })),
      customerName: customerDetails.name,
      customerPhone: customerDetails.contact,
      customerEmail: customerDetails.email,
      shippingAddress: customerDetails.address,
      pincode: customerDetails.pincode,
      total: (paymentData.paymentMethod === 'cod' ? paymentData.amount : orderTotal).toString(),
      ...paymentData
    };

    createOrderMutation.mutate(orderData);
  };

  const handlePaymentFailure = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
    // Stay on payment step for retry
  };

  if (orderItems.length === 0 && !cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Items to Checkout</h2>
            <p className="text-gray-600 mb-4">Your cart is empty or checkout session expired.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warmWhite">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-darkBrown mb-2">Secure Checkout</h1>
          <p className="text-primary">Complete your order with real-time payment processing</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${checkoutStep === 'details' ? 'text-primary' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                checkoutStep === 'details' ? 'wood-texture text-white' : 'bg-green-600 text-white'
              }`}>
                {checkoutStep === 'details' ? '1' : '✓'}
              </div>
              <span className="font-medium">Details</span>
            </div>
            
            <div className="w-16 h-0.5 bg-primary/30"></div>
            
            <div className={`flex items-center space-x-2 ${
              checkoutStep === 'payment' ? 'text-primary' : 
              checkoutStep === 'success' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                checkoutStep === 'payment' ? 'wood-texture text-white' :
                checkoutStep === 'success' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {checkoutStep === 'success' ? '✓' : '2'}
              </div>
              <span className="font-medium">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <img 
                      src={item.product.imageUrl || '/placeholder-furniture.jpg'} 
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.product.name}</div>
                      <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                    </div>
                    <div className="font-semibold">₹{item.total.toFixed(2)}</div>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{orderTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping:</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{orderTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">
            {checkoutStep === 'details' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDetailsSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={customerDetails.name}
                          onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                          required
                          data-testid="input-customer-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact">Phone Number *</Label>
                        <Input
                          id="contact"
                          value={customerDetails.contact}
                          onChange={(e) => setCustomerDetails(prev => ({ ...prev, contact: e.target.value }))}
                          placeholder="Enter your phone number"
                          required
                          data-testid="input-customer-phone"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerDetails.email}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email (optional)"
                        data-testid="input-customer-email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Shipping Address *</Label>
                      <Textarea
                        id="address"
                        value={customerDetails.address}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter your complete shipping address"
                        rows={3}
                        required
                        data-testid="input-customer-address"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pincode">PIN Code *</Label>
                        <Input
                          id="pincode"
                          value={customerDetails.pincode}
                          onChange={(e) => setCustomerDetails(prev => ({ ...prev, pincode: e.target.value }))}
                          placeholder="Enter PIN code"
                          required
                          data-testid="input-customer-pincode"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => window.history.back()}
                        className="flex-1 border-primary text-primary hover:bg-primary/10"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 wood-texture text-white hover:opacity-90 transition-opacity"
                        data-testid="button-continue-to-payment"
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {checkoutStep === 'payment' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div><strong>Name:</strong> {customerDetails.name}</div>
                      <div><strong>Phone:</strong> {customerDetails.contact}</div>
                      {customerDetails.email && <div><strong>Email:</strong> {customerDetails.email}</div>}
                      <div><strong>Address:</strong> {customerDetails.address}</div>
                      <div><strong>PIN Code:</strong> {customerDetails.pincode}</div>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 border-primary text-primary hover:bg-primary/10"
                      onClick={() => setCheckoutStep('details')}
                    >
                      Edit Details
                    </Button>
                  </CardContent>
                </Card>

                <RealTimePayment
                  amount={orderTotal}
                  customerDetails={customerDetails}
                  orderItems={orderItems}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentFailure={handlePaymentFailure}
                  onCancel={() => setCheckoutStep('details')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}