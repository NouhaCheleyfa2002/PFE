"use client";

import React, { useState } from "react";
import { X, CreditCard, Wallet, Smartphone, Check, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
    price: number;
    currency?: string;
  };
  onSuccess?: () => void;
}

type PaymentMethod = "card" | "e-dinar" | "mobile";
type PaymentStep = "method" | "details" | "processing" | "success";

export default function PaymentModal({ isOpen, onClose, document, onSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [step, setStep] = useState<PaymentStep>("method");
  const [error, setError] = useState<string | null>(null);
  
  // Card details
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  
  // E-Dinar details
  const [eDinarEmail, setEDinarEmail] = useState("");
  const [eDinarPassword, setEDinarPassword] = useState("");
  
  // Mobile payment details
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobilePin, setMobilePin] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setStep("method");
    setError(null);
    setCardNumber("");
    setCardName("");
    setExpiryDate("");
    setCvv("");
    setEDinarEmail("");
    setEDinarPassword("");
    setPhoneNumber("");
    setMobilePin("");
    onClose();
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(" ") : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validatePaymentDetails = () => {
    setError(null);
    
    if (paymentMethod === "card") {
      if (!cardNumber || cardNumber.replace(/\s/g, "").length !== 16) {
        setError("Please enter a valid 16-digit card number");
        return false;
      }
      if (!cardName || cardName.trim().length < 3) {
        setError("Please enter the cardholder name");
        return false;
      }
      if (!expiryDate || expiryDate.length !== 5) {
        setError("Please enter a valid expiry date (MM/YY)");
        return false;
      }
      if (!cvv || cvv.length !== 3) {
        setError("Please enter a valid 3-digit CVV");
        return false;
      }
    } else if (paymentMethod === "e-dinar") {
      if (!eDinarEmail || !eDinarEmail.includes("@")) {
        setError("Please enter a valid E-Dinar email");
        return false;
      }
      if (!eDinarPassword || eDinarPassword.length < 4) {
        setError("Please enter your E-Dinar password");
        return false;
      }
    } else if (paymentMethod === "mobile") {
      if (!phoneNumber || phoneNumber.length < 8) {
        setError("Please enter a valid phone number");
        return false;
      }
      if (!mobilePin || mobilePin.length !== 4) {
        setError("Please enter your 4-digit PIN");
        return false;
      }
    }
    
    return true;
  };

  const handlePayment = async () => {
    if (!validatePaymentDetails()) return;
    
    setStep("processing");
    setError(null);

    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      // Simulate processing delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch(`${API_URL}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Payment failed");
      }

      const result = await response.json();
      console.log("Payment successful:", result);

      setStep("success");
      
      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
      setStep("details");
    }
  };

  const renderPaymentMethodSelector = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Select Payment Method</h3>
      
      <div className="space-y-3">
        {/* Credit/Debit Card */}
        <button
          onClick={() => setPaymentMethod("card")}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
            paymentMethod === "card"
              ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]"
              : "border-[#edf0f7] hover:border-[#c0d0e8]"
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-[rgba(99,179,237,0.1)] flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#63b3ed]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-[#0d1b3e]">Credit / Debit Card</p>
            <p className="text-sm text-[#8899bb]">Visa, Mastercard, or Edahabia</p>
          </div>
          {paymentMethod === "card" && <Check className="w-5 h-5 text-[#63b3ed]" />}
        </button>

        {/* E-Dinar */}
        <button
          onClick={() => setPaymentMethod("e-dinar")}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
            paymentMethod === "e-dinar"
              ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]"
              : "border-[#edf0f7] hover:border-[#c0d0e8]"
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-[rgba(246,173,85,0.1)] flex items-center justify-center">
            <Wallet className="w-6 h-6 text-[#f6ad55]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-[#0d1b3e]">E-Dinar</p>
            <p className="text-sm text-[#8899bb]">Pay with your E-Dinar account</p>
          </div>
          {paymentMethod === "e-dinar" && <Check className="w-5 h-5 text-[#63b3ed]" />}
        </button>

        {/* Mobile Payment */}
        <button
          onClick={() => setPaymentMethod("mobile")}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
            paymentMethod === "mobile"
              ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]"
              : "border-[#edf0f7] hover:border-[#c0d0e8]"
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-[rgba(168,139,250,0.1)] flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-[#a78bfa]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-[#0d1b3e]">Mobile Payment</p>
            <p className="text-sm text-[#8899bb]">Ooredoo Money, Mobiflouss</p>
          </div>
          {paymentMethod === "mobile" && <Check className="w-5 h-5 text-[#63b3ed]" />}
        </button>
      </div>

      <button
        onClick={() => setStep("details")}
        className="w-full mt-6 py-3 rounded-xl bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
      >
        Continue
      </button>
    </div>
  );

  const renderPaymentDetails = () => {
    if (paymentMethod === "card") {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Card Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, "");
                if (value.length <= 16 && /^\d*$/.test(value)) {
                  setCardNumber(formatCardNumber(value));
                }
              }}
              maxLength={19}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Cardholder Name</label>
            <input
              type="text"
              placeholder="AHMED BEN SALEM"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Expiry Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    setExpiryDate(formatExpiryDate(value));
                  }
                }}
                maxLength={5}
                className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0d1b3e] mb-2">CVV</label>
              <input
                type="text"
                placeholder="123"
                value={cvv}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 3) {
                    setCvv(value);
                  }
                }}
                maxLength={3}
                className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("method")}
              className="flex-1 py-3 rounded-xl border border-[#edf0f7] text-[#0d1b3e] font-medium hover:bg-[#f9faff] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePayment}
              className="flex-1 py-3 rounded-xl bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
            >
              Pay {document.price} {document.currency || "TND"}
            </button>
          </div>
        </div>
      );
    } else if (paymentMethod === "e-dinar") {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">E-Dinar Login</h3>
          
          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Email Address</label>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={eDinarEmail}
              onChange={(e) => setEDinarEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={eDinarPassword}
              onChange={(e) => setEDinarPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("method")}
              className="flex-1 py-3 rounded-xl border border-[#edf0f7] text-[#0d1b3e] font-medium hover:bg-[#f9faff] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePayment}
              className="flex-1 py-3 rounded-xl bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
            >
              Pay {document.price} {document.currency || "TND"}
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Mobile Payment</h3>
          
          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Phone Number</label>
            <input
              type="tel"
              placeholder="20 123 456"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 8) {
                  setPhoneNumber(value);
                }
              }}
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">PIN Code</label>
            <input
              type="password"
              placeholder="••••"
              value={mobilePin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 4) {
                  setMobilePin(value);
                }
              }}
              maxLength={4}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] outline-none focus:border-[#63b3ed] transition-all"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("method")}
              className="flex-1 py-3 rounded-xl border border-[#edf0f7] text-[#0d1b3e] font-medium hover:bg-[#f9faff] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePayment}
              className="flex-1 py-3 rounded-xl bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
            >
              Pay {document.price} {document.currency || "TND"}
            </button>
          </div>
        </div>
      );
    }
  };

  const renderProcessing = () => (
    <div className="text-center py-8">
      <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#63b3ed] animate-spin" />
      <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">Processing Payment...</h3>
      <p className="text-sm text-[#8899bb]">Please wait while we process your payment</p>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">Payment Successful!</h3>
      <p className="text-sm text-[#8899bb] mb-4">You can now access this resource</p>
      <p className="text-xs text-[#aab4cc]">Redirecting...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#edf0f7]">
          <div>
            <h2 className="text-xl font-bold text-[#0d1b3e]">Purchase Resource</h2>
            <p className="text-sm text-[#8899bb] mt-1 truncate max-w-[300px]">{document.title}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors"
            disabled={step === "processing"}
          >
            <X className="w-5 h-5 text-[#8899bb]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Price Display */}
          {step !== "success" && (
            <div className="mb-6 p-4 rounded-xl bg-[#f9faff] border border-[#edf0f7]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8899bb]">Total Amount</span>
                <span className="text-2xl font-bold text-[#0d1b3e]">
                  {document.price} {document.currency || "TND"}
                </span>
              </div>
            </div>
          )}

          {/* Steps */}
          {step === "method" && renderPaymentMethodSelector()}
          {step === "details" && renderPaymentDetails()}
          {step === "processing" && renderProcessing()}
          {step === "success" && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
