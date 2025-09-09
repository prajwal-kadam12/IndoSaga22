import React, { useState, useEffect } from 'react';
import { X, Smartphone, QrCode, CreditCard, Wallet, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createRazorpayOrder, initializeRazorpay, getPaymentConfig } from '@/lib/razorpay';

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: string) => void;
  total: number;
  phoneNumber?: string;
  customerDetails?: any;
  productDetails?: any;
}

export default function RazorpayPaymentModal({ 
  isOpen, 
  onClose, 
  onSelectMethod, 
  total,
  phoneNumber = "8860009032",
  customerDetails,
  productDetails
}: RazorpayPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showCodConfirmation, setShowCodConfirmation] = useState<boolean>(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState<boolean>(false);
  
  useEffect(() => {
    if (isOpen) {
      fetchPaymentConfig();
    }
  }, [isOpen]);
  
  const fetchPaymentConfig = async () => {
    try {
      const config = await getPaymentConfig();
      setPaymentConfig(config);
    } catch (error) {
      console.error('Failed to fetch payment config:', error);
    }
  };

  if (!isOpen) return null;

  // UPI Apps for detailed UPI selection
  const upiApps = [
    { id: 'phonepe', name: 'PhonePe', icon: '📱', color: 'bg-purple-600' },
    { id: 'googlepay', name: 'Google Pay', icon: '🅖', color: 'bg-blue-600' },
    { id: 'paytm', name: 'Paytm', icon: '💙', color: 'bg-blue-500' },
    { id: 'amazonpay', name: 'Amazon Pay', icon: '🅰️', color: 'bg-orange-500' },
    { id: 'bhim', name: 'BHIM UPI', icon: '🇮🇳', color: 'bg-green-600' },
    { id: 'upi', name: 'Any UPI App', icon: '📲', color: 'bg-gray-600' }
  ];
  
  // Payment options - UPI, Cards, Net Banking, COD
  const paymentOptions = [
    {
      id: 'upi',
      title: 'UPI',
      subtitle: '2 Offers',
      icon: <Smartphone className="h-5 w-5" />,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      badgeText: 'Instant',
      badgeColor: 'text-green-600',
      bgColor: 'hover:bg-green-50'
    },
    {
      id: 'card',
      title: 'Cards',
      subtitle: 'Applicable on all plans',
      icon: <CreditCard className="h-5 w-5" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badgeText: 'Secure',
      badgeColor: 'text-blue-600',
      bgColor: 'hover:bg-blue-50'
    },
    {
      id: 'netbanking',
      title: 'Netbanking',
      subtitle: 'Applicable on all plans',
      icon: <Wallet className="h-5 w-5" />,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      badgeText: 'Trusted',
      badgeColor: 'text-indigo-600',
      bgColor: 'hover:bg-indigo-50'
    },
    {
      id: 'wallet',
      title: 'Wallet',
      subtitle: 'Applicable on all plans',
      icon: <Wallet className="h-5 w-5" />,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      badgeText: 'Fast',
      badgeColor: 'text-purple-600',
      bgColor: 'hover:bg-purple-50'
    },
    {
      id: 'cod',
      title: 'Cash on Delivery',
      subtitle: 'Pay when your order arrives',
      icon: <span className="text-orange-600">💰</span>,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      badgeText: 'Convenient',
      badgeColor: 'text-orange-600',
      bgColor: 'hover:bg-orange-50'
    }
  ];

  const handleMethodSelect = async (methodId: string) => {
    setSelectedMethod(methodId);
    if (methodId === 'cod') {
      // Show confirmation for COD
      setTimeout(() => setShowCodConfirmation(true), 300);
    } else if (methodId === 'upi') {
      // Directly open Razorpay for UPI payment
      await initiateRazorpayPayment('upi');
    } else {
      // Show expanded view for other payment methods
      setShowPaymentDetails(true);
    }
  };
  
  const handleUpiAppSelect = async (upiAppId: string) => {
    setLoading(true);
    try {
      await initiateRazorpayPayment('upi', upiAppId);
    } catch (error) {
      console.error('UPI payment failed:', error);
    }
    setLoading(false);
  };
  
  const initiateRazorpayPayment = async (paymentMethod: string, upiApp?: string) => {
    if (!paymentConfig?.enabled) {
      alert('Payment system is not configured. Please try again later.');
      return;
    }
    
    setLoading(true);
    try {
      // Create order on backend
      const order = await createRazorpayOrder(total, customerDetails);
      
      // Configure Razorpay options
      const options = {
        key: paymentConfig.key,
        amount: order.amount,
        currency: order.currency,
        name: 'IndoSaga',
        description: `Payment for ${productDetails?.name || 'Order'}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verification = await fetch('/api/verify-razorpay-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            
            if (verification.ok) {
              onSelectMethod(paymentMethod);
              onClose();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: customerDetails?.name || '',
          email: customerDetails?.email || '',
          contact: customerDetails?.contact || phoneNumber
        },
        notes: {
          address: customerDetails?.address || ''
        },
        theme: {
          color: '#D97706'
        },
        method: {
          upi: paymentMethod === 'upi',
          card: paymentMethod === 'upi' || paymentMethod === 'card',
          netbanking: paymentMethod === 'upi' || paymentMethod === 'netbanking',
          wallet: paymentMethod === 'upi' || paymentMethod === 'wallet'
        }
      };
      
      // Open Razorpay checkout
      await initializeRazorpay(options);
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      alert('Payment failed. Please try again.');
    }
    setLoading(false);
  };

  const handleCodConfirmation = () => {
    setShowCodConfirmation(false);
    onSelectMethod('cod');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm pt-24">
      <div className={`bg-white rounded-2xl w-full mx-4 relative overflow-hidden shadow-2xl border-0 max-h-[75vh] ${
        showPaymentDetails ? 'max-w-4xl' : 'max-w-md'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">{productDetails?.name || 'Product'}</h2>
              <p className="text-sm opacity-90">Payment Options</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Price Summary */}
        {!showPaymentDetails && (
          <div className="px-4 py-3 bg-gray-50 border-b">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Price Summary</span>
              <span className="text-sm text-blue-600">View all</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 mt-1">₹{total}</div>
            <div className="text-xs text-gray-500 mt-1">Free</div>
          </div>
        )}

        {/* Main Content */}
        <div className={showPaymentDetails ? "flex flex-col sm:flex-row max-h-[60vh] overflow-hidden scrollbar-hide" : "max-h-[60vh] overflow-y-auto p-4 pb-20 scrollbar-hide"} style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {/* Left Side - Payment Options */}
          <div className={showPaymentDetails ? "w-full md:w-1/2 p-4 overflow-y-auto scrollbar-hide" : "w-full"} style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {showPaymentDetails && (
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-3 rounded-t-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">IndoSaga</h3>
                  </div>
                  <button onClick={() => setShowPaymentDetails(false)} className="text-white hover:text-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {showPaymentDetails && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg mb-4 border border-amber-200">
                <div className="text-sm text-gray-600">Price Summary</div>
                <div className="text-2xl font-bold text-gray-800">₹{total}</div>
                <div className="text-xs text-gray-500">Free</div>
              </div>
            )}
            
            {showPaymentDetails && (
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-2 rounded-lg mb-4 flex items-center">
                <span className="text-sm">📞 Using as +91 {phoneNumber || '88650 09032'}</span>
              </div>
            )}
            
            {showPaymentDetails && (
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-2 rounded-lg mb-4 flex items-center">
                <span className="text-sm">💳 Offers on Card, Netban...</span>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Recommended</h3>
              {!showPaymentDetails && <h3 className="text-sm font-medium text-gray-700">Available Offers</h3>}
            </div>
            
            <div className="space-y-2">
              {paymentOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => !loading && handleMethodSelect(option.id)}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedMethod === option.id 
                      ? 'border-amber-500 bg-amber-50' 
                      : `border-gray-200 ${option.bgColor} hover:border-amber-300`
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${option.iconBg} rounded flex items-center justify-center`}>
                      {typeof option.icon === 'string' ? (
                        <span className="text-sm">{option.icon}</span>
                      ) : (
                        <div className={option.iconColor}>{option.icon}</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{option.title}</div>
                      <div className="text-xs text-gray-600">{option.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${option.badgeColor}`}>
                      {option.badgeText}
                    </span>
                    {selectedMethod === option.id && (
                      <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <Check className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {loading && (
              <div className="text-center py-4">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                  <span className="text-sm text-gray-600">Processing payment...</span>
                </div>
              </div>
            )}
            
            {/* Back Button for Payment Options */}
            {!showCodConfirmation && !loading && (
              <div className="mt-6 pt-4 border-t border-gray-200 mb-4">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full h-14 px-4 py-3 border-amber-300 text-amber-700 hover:bg-amber-50 transition-all duration-300 font-semibold text-base flex items-center justify-center whitespace-nowrap"
                  data-testid="button-back-payment-options"
                >
                  ← Back to Product Details
                </Button>
              </div>
            )}
          </div>
          
          {/* Right Side - Payment Details Section */}
          {showPaymentDetails && (
            <div className="w-full md:w-1/2 p-4 border-l border-t md:border-t-0 overflow-y-auto scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Available Offers</h3>
                <span className="text-sm text-amber-600">View all</span>
              </div>
              
              {/* Cashback Offer */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                  <span className="text-sm font-medium">Get ₹10-₹50 assured cashback on any UPI payment above ₹50</span>
                </div>
              </div>
              
              {/* UPI QR Section */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 mb-3">UPI QR</h4>
                  
                  {/* QR Code */}
                  <div className="w-32 h-32 bg-white border-2 border-gray-300 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <QrCode className="h-20 w-20 text-gray-600" />
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">Scan the QR code with any UPI App</p>
                  
                  {/* UPI Apps Icons */}
                  <div className="flex justify-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold" title="PhonePe">📱</div>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold" title="Google Pay">🅖</div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold" title="Paytm">💙</div>
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold" title="PhonePe">🟣</div>
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold" title="BHIM">🇮🇳</div>
                  </div>
                  
                  <button 
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                    onClick={() => !loading && handleUpiAppSelect('upi')}
                    disabled={loading}
                  >
                    Show QR
                  </button>
                  
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">2 Offers</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COD Confirmation Modal */}
        {showCodConfirmation && (
          <div className="absolute inset-0 bg-white rounded-lg z-10">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Confirm Your Order</h2>
                <button
                  onClick={() => setShowCodConfirmation(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-4 pb-2 max-h-[50vh] overflow-y-auto scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Cash on Delivery</h3>
                <p className="text-gray-600">Pay when your furniture is delivered</p>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-4 border border-amber-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Order Total</span>
                  <span className="text-xl font-bold text-gray-800">₹{total}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>COD Convenience Fee</span>
                  <span>₹99</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Amount</span>
                  <span className="text-lg">₹{total + 99}</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Please keep exact change ready. Inspect your furniture before making payment.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowCodConfirmation(false)}
                  variant="outline" 
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCodConfirmation}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="button-confirm-cod"
                >
                  Confirm Order
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 text-center border-t border-amber-200">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-3 w-3 text-gray-500" />
            <p className="text-xs text-amber-600">Secured by <span className="font-semibold text-amber-700">Razorpay</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}