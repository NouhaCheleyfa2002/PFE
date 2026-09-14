"use client";

import { useRouter } from 'next/navigation';
import { XCircle, ShoppingCart, ArrowLeft, AlertCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Cancel Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-100 rounded-full -ml-24 -mb-24 opacity-50"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Cancel Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <XCircle className="w-14 h-14 text-white" />
                </div>
              </div>
            </div>

            {/* Cancel Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Payment Cancelled
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your payment was not completed. No charges were made to your account.
            </p>

            {/* Info Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">What happened?</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Your cart items are still saved</li>
                    <li>• No payment was processed</li>
                    <li>• You can try checking out again anytime</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <button
                onClick={() => router.push('/dashboard/cart')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <ShoppingCart className="w-5 h-5" />
                Return to Cart
              </button>
              
              <button
                onClick={() => router.push('/dashboard/library')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-purple-300 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
                Browse Resources
              </button>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Having trouble? Contact us at{' '}
            <a href="mailto:support@edushare.com" className="text-purple-600 hover:underline font-medium">
              support@edushare.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
