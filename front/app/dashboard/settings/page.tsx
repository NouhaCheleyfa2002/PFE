"use client";

import React from "react";
import { Check } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e] mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Profile section */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Profile</h2>
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-2xl font-bold text-white">
              DA
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue="Dr. Amira Ben Ali"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="amira.benali@fmtunis.tn"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">University</label>
                  <input
                    type="text"
                    defaultValue="Faculté de Médecine de Tunis"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">Specialty</label>
                  <input
                    type="text"
                    defaultValue="Cardiology"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Verification Status</h2>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-green-700">Verified Educator</p>
              <p className="text-sm text-green-600">Your professional ID was verified on March 15, 2026</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Notifications</h2>
          <div className="space-y-3">
            {[
              { label: "Email notifications for new ratings", checked: true },
              { label: "Weekly digest of new resources", checked: true },
              { label: "Notify when someone downloads my content", checked: false },
            ].map((item) => (
              <label key={item.label} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="w-4 h-4 rounded border-[#dde2ef] text-[#63b3ed] focus:ring-[#63b3ed]"
                />
                <span className="text-sm text-[#4a5568]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button className="w-full py-3 rounded-xl bg-[#0d1b3e] text-white font-semibold hover:bg-[#1a2d5a] transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
