"use client";

import React, { useEffect, useState } from "react";
import { Building2, MapPin, Phone, Mail, Calendar } from "lucide-react";

/**
 * MetadataForm Component
 * 
 * Editable form for institution metadata fields.
 * Updates live preview with 500ms debounce.
 * 
 * Requirements: 4.1-4.6 (Task 10.3)
 */

interface MetadataFormData {
  institutionName: string;
  institutionAddress: string;
  contactPhone: string;
  contactEmail: string;
  academicYear: string;
}

interface MetadataFormProps {
  initialData?: Partial<MetadataFormData>;
  onChange?: (data: MetadataFormData) => void;
  errors?: Partial<Record<keyof MetadataFormData, string>>;
}

export function MetadataForm({
  initialData,
  onChange,
  errors = {},
}: MetadataFormProps) {
  const [formData, setFormData] = useState<MetadataFormData>({
    institutionName: initialData?.institutionName || "",
    institutionAddress: initialData?.institutionAddress || "",
    contactPhone: initialData?.contactPhone || "",
    contactEmail: initialData?.contactEmail || "",
    academicYear: initialData?.academicYear || "",
  });

  const [debouncedData, setDebouncedData] = useState(formData);

  // Update form when initialData changes (e.g., from AI extraction)
  useEffect(() => {
    if (initialData) {
      setFormData({
        institutionName: initialData.institutionName || "",
        institutionAddress: initialData.institutionAddress || "",
        contactPhone: initialData.contactPhone || "",
        contactEmail: initialData.contactEmail || "",
        academicYear: initialData.academicYear || "",
      });
    }
  }, [initialData]);

  // Debounce updates to parent (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedData(formData);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData]);

  // Notify parent when debounced data changes
  useEffect(() => {
    if (onChange) {
      onChange(debouncedData);
    }
  }, [debouncedData, onChange]);

  const handleChange = (field: keyof MetadataFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5">
      {/* Institution Name */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b3e] mb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#63b3ed]" />
          Institution Name
        </label>
        <input
          type="text"
          value={formData.institutionName}
          onChange={(e) => handleChange("institutionName", e.target.value)}
          placeholder="e.g., University of Tunis"
          className={`w-full px-4 py-3 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
            errors.institutionName ? "border-red-300" : "border-[#edf0f7]"
          }`}
        />
        {errors.institutionName && (
          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
            <span>⚠</span>
            {errors.institutionName}
          </p>
        )}
      </div>

      {/* Institution Address */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b3e] mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#63b3ed]" />
          Address
        </label>
        <input
          type="text"
          value={formData.institutionAddress}
          onChange={(e) => handleChange("institutionAddress", e.target.value)}
          placeholder="e.g., 123 Main Street, Tunis, Tunisia"
          className={`w-full px-4 py-3 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
            errors.institutionAddress ? "border-red-300" : "border-[#edf0f7]"
          }`}
        />
        {errors.institutionAddress && (
          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
            <span>⚠</span>
            {errors.institutionAddress}
          </p>
        )}
      </div>

      {/* Contact Information Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[#0d1b3e] mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#63b3ed]" />
            Phone
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => handleChange("contactPhone", e.target.value)}
            placeholder="+216 71 123 456"
            className={`w-full px-4 py-3 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
              errors.contactPhone ? "border-red-300" : "border-[#edf0f7]"
            }`}
          />
          {errors.contactPhone && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>⚠</span>
              {errors.contactPhone}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#0d1b3e] mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#63b3ed]" />
            Email
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
            placeholder="contact@university.tn"
            className={`w-full px-4 py-3 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
              errors.contactEmail ? "border-red-300" : "border-[#edf0f7]"
            }`}
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <span>⚠</span>
              {errors.contactEmail}
            </p>
          )}
        </div>
      </div>

      {/* Academic Year */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b3e] mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#63b3ed]" />
          Academic Year
        </label>
        <input
          type="text"
          value={formData.academicYear}
          onChange={(e) => handleChange("academicYear", e.target.value)}
          placeholder="e.g., 2024-2025"
          className={`w-full px-4 py-3 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
            errors.academicYear ? "border-red-300" : "border-[#edf0f7]"
          }`}
        />
        {errors.academicYear && (
          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
            <span>⚠</span>
            {errors.academicYear}
          </p>
        )}
        <p className="text-xs text-[#8899bb] mt-1">
          Format: YYYY-YYYY (e.g., 2024-2025)
        </p>
      </div>

      {/* Help Text */}
      <div className="p-4 rounded-lg bg-[#f9faff] border border-[#edf0f7]">
        <p className="text-sm text-[#8899bb]">
          <strong className="text-[#0d1b3e]">💡 Tip:</strong> This information
          will appear in the header of all exams created with this template.
          Changes are previewed in real-time.
        </p>
      </div>
    </div>
  );
}
