import { useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AuthRedirectHandler() {
  const { toast } = useToast();
  
  // Check authentication status
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    // Only run if user is authenticated
    if (!user) return;

    // Check for pending actions after login
    const pendingAction = sessionStorage.getItem('pendingAction');
    const pendingProductId = sessionStorage.getItem('pendingProductId');
    const pendingQuantity = sessionStorage.getItem('pendingQuantity');

    if (pendingAction && pendingProductId) {
      // Clear the pending action first
      sessionStorage.removeItem('pendingAction');
      sessionStorage.removeItem('pendingProductId');
      sessionStorage.removeItem('pendingQuantity');

      if (pendingAction === 'add-to-cart') {
        // Add the product to cart
        handleAddToCart(pendingProductId, parseInt(pendingQuantity || '1'));
      } else if (pendingAction === 'buy-now') {
        // Redirect to the specific product for buy now
        // We could also trigger the buy now flow directly
        toast({
          title: "Welcome back!",
          description: "You can now proceed with your purchase.",
        });
      }
    }
  }, [user]);

  const handleAddToCart = async (productId: string, quantity: number = 1) => {
    try {
      await apiRequest("POST", "/api/cart", { 
        productId,
        quantity
      });
      
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  // This component doesn't render anything
  return null;
}