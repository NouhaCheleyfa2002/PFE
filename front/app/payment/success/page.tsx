"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Download, ArrowRight, Package, Sparkles, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      toast.error('Invalid payment session');
      router.push('/dashboard/cart');
      return;
    }

    // Clear cart after successful payment
    localStorage.removeItem('cart');
    window.dispatchEvent(new Event('cartUpdated'));

    // Show success toast
    toast.success('Payment successful! You can now access your resources', {
      icon: <CheckCircle className="w-5 h-5" />,
      duration: 5000,
    });

    // Countdown and redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use setTimeout to avoid updating during render
          setTimeout(() => {
            router.push('/dashboard/resources?tab=library');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100 rounded-full -ml-24 -mb-24 opacity-50"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-14 h-14 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your purchase has been completed successfully
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Payment Verified</h3>
                <p className="text-sm text-gray-600">Transaction completed securely</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Access Granted</h3>
                <p className="text-sm text-gray-600">Resources ready to download</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Email Sent</h3>
                <p className="text-sm text-gray-600">Check your inbox for receipt</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => router.push('/dashboard/resources?tab=library')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                View My Resources
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => router.push('/dashboard/library')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-purple-300 hover:shadow-lg transition-all duration-300"
              >
                <Package className="w-5 h-5" />
                Browse More
              </button>
            </div>

            {/* Auto-redirect notice */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              <span>Redirecting to your library in {countdown} seconds...</span>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Need help? Contact us at{' '}
            <a href="mailto:support@edushare.com" className="text-purple-600 hover:underline font-medium">
              support@edushare.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
