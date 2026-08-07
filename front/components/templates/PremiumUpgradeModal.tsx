"use client";

import React from "react";
import { X, Crown, Check, Sparkles, Zap, Shield } from "lucide-react";

/**
 * PremiumUpgradeModal Component
 * 
 * Displays when a non-premium user tries to access premium features.
 * Shows upgrade benefits and links to subscription page.
 * 
 * Requirements: 17.1
 */

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export function PremiumUpgradeModal({
  isOpen,
  onClose,
  feature = "Template Builder",
}: PremiumUpgradeModalProps) {
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    // Navigate to subscription/upgrade page
    // You can replace this with actual navigation logic
    window.location.href = "/dashboard/profile?tab=subscription";
  };

  const benefits = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Custom Exam Templates",
      description: "Create up to 10 reusable templates with your institution's branding",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "AI-Powered Metadata Extraction",
      description: "Automatically extract institution info from existing documents",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Professional Features",
      description: "Custom logos, watermarks, colors, and advanced formatting options",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Badge Header */}
        <div className="relative h-32 bg-gradient-to-r from-[#63b3ed] via-[#4299e1] to-[#3182ce] overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Upgrade to Premium</h2>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Message */}
          <div className="text-center mb-8">
            <p className="text-lg text-[#0d1b3e] mb-2">
              <strong>{feature}</strong> is a premium feature
            </p>
            <p className="text-sm text-[#8899bb]">
              Upgrade your account to access advanced template management and customization
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-xl bg-[#f9faff] border border-[#edf0f7] hover:border-[#63b3ed] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#e8f4fc] to-[#d4ebf9] flex items-center justify-center text-[#63b3ed] shrink-0">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0d1b3e] mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-[#8899bb]">{benefit.description}</p>
                </div>
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-1" />
              </div>
            ))}
          </div>

          {/* Pricing Info */}
          <div className="text-center mb-6 p-4 rounded-xl bg-gradient-to-r from-[#e8f4fc] to-[#d4ebf9]">
            <p className="text-sm text-[#8899bb] mb-1">Premium Teacher Plan</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-[#0d1b3e]">$9.99</span>
              <span className="text-sm text-[#8899bb]">/month</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#f9faff] text-[#0d1b3e] rounded-lg hover:bg-[#edf0f7] transition-colors font-medium"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgradeClick}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Upgrade Now
            </button>
          </div>

          {/* Fine Print */}
          <p className="text-xs text-[#c0d0e8] text-center mt-4">
            Cancel anytime. No long-term commitment required.
          </p>
        </div>
      </div>

      {/* Backdrop click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close modal"
      />
    </div>
  );
}
