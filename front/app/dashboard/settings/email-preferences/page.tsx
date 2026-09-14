"use client";

import React, { useEffect, useState } from "react";
import { Mail, Bell, ShieldCheck, FileText, Users, ShoppingCart, BookOpen, Shield, TrendingUp, Loader2 } from "lucide-react";
import { mailApi, EmailPreferences } from "@/lib/api/mail";
import toast from "react-hot-toast";

export default function EmailPreferencesPage() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await mailApi.getPreferences();
      setPreferences(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load email preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof EmailPreferences) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await mailApi.updatePreferences({
        welcomeEmails: preferences.welcomeEmails,
        securityAlerts: preferences.securityAlerts,
        passwordChangedEmails: preferences.passwordChangedEmails,
        verificationStatusEmails: preferences.verificationStatusEmails,
        resourceModerationEmails: preferences.resourceModerationEmails,
        resourceApprovedEmails: preferences.resourceApprovedEmails,
        collaborationInvites: preferences.collaborationInvites,
        collaborationMentions: preferences.collaborationMentions,
        collaborationAcceptedEmails: preferences.collaborationAcceptedEmails,
        purchaseConfirmations: preferences.purchaseConfirmations,
        saleNotifications: preferences.saleNotifications,
        examPublishedEmails: preferences.examPublishedEmails,
        examSharedEmails: preferences.examSharedEmails,
        examGeneratedEmails: preferences.examGeneratedEmails,
        adminVerificationAlerts: preferences.adminVerificationAlerts,
        adminModerationAlerts: preferences.adminModerationAlerts,
        adminReportAlerts: preferences.adminReportAlerts,
        marketingEmails: preferences.marketingEmails,
        weeklyDigest: preferences.weeklyDigest,
      });
      toast.success("✅ Email preferences updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = () => {
    if (!preferences) return;
    const allEnabled = { ...preferences };
    Object.keys(allEnabled).forEach((key) => {
      if (typeof allEnabled[key as keyof EmailPreferences] === "boolean") {
        (allEnabled[key as keyof EmailPreferences] as boolean) = true;
      }
    });
    setPreferences(allEnabled);
  };

  const handleDisableAll = () => {
    if (!preferences) return;
    const allDisabled = { ...preferences };
    Object.keys(allDisabled).forEach((key) => {
      if (typeof allDisabled[key as keyof EmailPreferences] === "boolean") {
        (allDisabled[key as keyof EmailPreferences] as boolean) = false;
      }
    });
    setPreferences(allDisabled);
  };

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#63b3ed]" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">Failed to load email preferences</p>
          <button
            onClick={loadPreferences}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const PreferenceToggle = ({
    icon: Icon,
    label,
    description,
    prefKey,
  }: {
    icon: any;
    label: string;
    description: string;
    prefKey: keyof EmailPreferences;
  }) => (
    <label className="flex items-start gap-4 cursor-pointer group py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white group-hover:shadow-md transition-shadow">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#0d1b3e] text-sm">{label}</div>
        <div className="text-xs text-[#8899bb] mt-0.5">{description}</div>
      </div>
      <div className="flex-shrink-0">
        <div className="relative inline-block">
          <input
            type="checkbox"
            checked={preferences[prefKey] as boolean}
            onChange={() => handleToggle(prefKey)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-[#63b3ed] transition-colors"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
        </div>
      </div>
    </label>
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-2xl font-bold text-[#0d1b3e] mb-1"
          >
            Email Preferences
          </h1>
          <p className="text-sm text-[#8899bb]">Manage which emails you want to receive</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEnableAll}
            className="px-4 py-2 rounded-lg border border-[#edf0f7] text-sm font-medium text-[#0d1b3e] hover:bg-gray-50 transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={handleDisableAll}
            className="px-4 py-2 rounded-lg border border-[#edf0f7] text-sm font-medium text-[#0d1b3e] hover:bg-gray-50 transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Authentication & Security */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Authentication & Security</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={Mail}
              label="Welcome Emails"
              description="Receive a welcome email when you create your account"
              prefKey="welcomeEmails"
            />
            <PreferenceToggle
              icon={ShieldCheck}
              label="Security Alerts"
              description="Get notified about unusual login activity or security concerns"
              prefKey="securityAlerts"
            />
            <PreferenceToggle
              icon={Shield}
              label="Password Changed"
              description="Confirmation email when your password is changed"
              prefKey="passwordChangedEmails"
            />
          </div>
        </div>

        {/* Teacher Verification */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Teacher Verification</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={FileText}
              label="Verification Status Updates"
              description="Get notified about your verification request status (approved/rejected)"
              prefKey="verificationStatusEmails"
            />
          </div>
        </div>

        {/* Resources & Documents */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Resources & Documents</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={Bell}
              label="Moderation Updates"
              description="Get notified about your resource moderation status"
              prefKey="resourceModerationEmails"
            />
            <PreferenceToggle
              icon={BookOpen}
              label="Resource Approved"
              description="Confirmation when your resource is approved and published"
              prefKey="resourceApprovedEmails"
            />
          </div>
        </div>

        {/* Collaboration */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Collaboration</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={Users}
              label="Collaboration Invitations"
              description="Get notified when someone invites you to collaborate on an exam"
              prefKey="collaborationInvites"
            />
            <PreferenceToggle
              icon={Bell}
              label="Mentions in Comments"
              description="Get notified when someone mentions you in a comment"
              prefKey="collaborationMentions"
            />
            <PreferenceToggle
              icon={Users}
              label="Invitation Accepted"
              description="Get notified when someone accepts your collaboration invitation"
              prefKey="collaborationAcceptedEmails"
            />
          </div>
        </div>

        {/* Marketplace & Sales */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Marketplace & Sales</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={ShoppingCart}
              label="Purchase Confirmations"
              description="Receive confirmation when you purchase a resource (Students)"
              prefKey="purchaseConfirmations"
            />
            <PreferenceToggle
              icon={TrendingUp}
              label="Sale Notifications"
              description="Get notified when someone purchases your resource (Teachers)"
              prefKey="saleNotifications"
            />
          </div>
        </div>

        {/* Exams */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Exams</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={BookOpen}
              label="Exam Published"
              description="Get notified when your exam is published"
              prefKey="examPublishedEmails"
            />
            <PreferenceToggle
              icon={FileText}
              label="Exam Shared With You"
              description="Get notified when someone shares an exam with you"
              prefKey="examSharedEmails"
            />
            <PreferenceToggle
              icon={Bell}
              label="AI Exam Generated"
              description="Get notified when AI finishes generating your exam"
              prefKey="examGeneratedEmails"
            />
          </div>
        </div>

        {/* Admin Notifications */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">Admin Notifications</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={Shield}
              label="New Verification Requests"
              description="Get notified about new teacher verification requests (Admins only)"
              prefKey="adminVerificationAlerts"
            />
            <PreferenceToggle
              icon={Bell}
              label="Resource Moderation Alerts"
              description="Get notified about new resources to moderate (Admins only)"
              prefKey="adminModerationAlerts"
            />
            <PreferenceToggle
              icon={ShieldCheck}
              label="Report Alerts"
              description="Get notified about new resource reports (Admins only)"
              prefKey="adminReportAlerts"
            />
          </div>
        </div>

        {/* General Preferences */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-[#63b3ed]" />
            <h2 className="text-lg font-semibold text-[#0d1b3e]">General</h2>
          </div>
          <div className="space-y-1">
            <PreferenceToggle
              icon={TrendingUp}
              label="Marketing Emails"
              description="Receive promotional emails about new features and updates"
              prefKey="marketingEmails"
            />
            <PreferenceToggle
              icon={Mail}
              label="Weekly Digest"
              description="Receive a weekly summary of your activity and updates"
              prefKey="weeklyDigest"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#0d1b3e] text-white font-semibold hover:bg-[#1a2d5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </button>
      </div>
    </div>
  );
}
