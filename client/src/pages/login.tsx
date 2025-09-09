import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Mail, LogIn, ArrowLeft, X } from 'lucide-react';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { auth0Config, isAuth0Configured } from '@/lib/auth0-config';

export default function Login() {
  const { loginWithRedirect, isAuthenticated, user, isLoading } = useAuth0();
  const [showGoogleConfirm, setShowGoogleConfirm] = useState(false);
  const [showFacebookConfirm, setShowFacebookConfirm] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  // Handle redirect after login - Let callback.tsx handle this instead
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to callback to handle pending actions properly
      window.location.href = '/callback';
    }
  }, [isAuthenticated, user]);

  const handleGoogleLogin = () => {
    setShowGoogleConfirm(true);
  };

  const handleFacebookLogin = () => {
    setShowFacebookConfirm(true);
  };

  const handleEmailLogin = () => {
    setShowEmailConfirm(true);
  };

  const proceedWithGoogleLogin = () => {
    setShowGoogleConfirm(false);
    loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2'
      },
      appState: {
        returnTo: window.location.origin
      }
    });
  };

  const proceedWithFacebookLogin = () => {
    setShowFacebookConfirm(false);
    loginWithRedirect({
      appState: {
        returnTo: window.location.origin
      }
    });
  };

  const proceedWithEmailLogin = () => {
    setShowEmailConfirm(false);
    loginWithRedirect({
      appState: {
        returnTo: window.location.origin
      }
    });
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-warmWhite flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-warmWhite flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warmWhite flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display text-darkBrown">
            Welcome to IndoSaga
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Sign in to continue your furniture shopping experience
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            data-testid="button-google-login"
          >
            <FaGoogle className="w-5 h-5" />
            <span>Continue with Google</span>
          </Button>

          <Button
            onClick={handleFacebookLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            data-testid="button-facebook-login"
          >
            <FaFacebook className="w-5 h-5" />
            <span>Continue with Facebook</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <Button
            onClick={handleEmailLogin}
            variant="outline"
            className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            data-testid="button-email-login"
          >
            <Mail className="w-5 h-5" />
            <span>Continue with Email</span>
          </Button>

          <div className="text-center mt-6">
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-500 text-center mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </div>
          
          {/* Real Authentication Notice */}
          <div className="text-center mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 font-medium">Real Authentication Enabled</p>
            <p className="text-xs text-green-600 mt-1">
              Secure login with your Google, Facebook, or email account
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Login Confirmation Dialog */}
      <Dialog open={showGoogleConfirm} onOpenChange={setShowGoogleConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FaGoogle className="w-5 h-5 text-red-500" />
              <span>Continue with Google</span>
            </DialogTitle>
            <DialogDescription>
              Confirm your Google authentication to access your IndoSaga account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              You will be redirected to Google to sign in with your Google account. This will allow you to securely access your IndoSaga account.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> If you want to cancel after being redirected, simply close the login window or click your browser's back button to return to IndoSaga.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={proceedWithGoogleLogin}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Continue to Google
              </Button>
              <Button
                onClick={() => setShowGoogleConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Facebook Login Confirmation Dialog */}
      <Dialog open={showFacebookConfirm} onOpenChange={setShowFacebookConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FaFacebook className="w-5 h-5 text-blue-600" />
              <span>Continue with Facebook</span>
            </DialogTitle>
            <DialogDescription>
              Confirm your Facebook authentication to access your IndoSaga account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              You will be redirected to Facebook to sign in with your Facebook account. This will allow you to securely access your IndoSaga account.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> If you want to cancel after being redirected, simply close the login window or click your browser's back button to return to IndoSaga.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={proceedWithFacebookLogin}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue to Facebook
              </Button>
              <Button
                onClick={() => setShowFacebookConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Login Confirmation Dialog */}
      <Dialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-primary" />
              <span>Continue with Email</span>
            </DialogTitle>
            <DialogDescription>
              Confirm your email authentication to access your IndoSaga account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              You will be redirected to our secure login page where you can sign in with your email address or create a new account.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> If you want to cancel after being redirected, simply close the login window or click your browser's back button to return to IndoSaga.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={proceedWithEmailLogin}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                Continue with Email
              </Button>
              <Button
                onClick={() => setShowEmailConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}