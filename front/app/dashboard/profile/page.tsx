"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  BadgeCheck,
  Clock,
  XCircle,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Video,
  FileText,
  CheckCircle,
  AlertCircle,
  Check,
} from "lucide-react";
import { authService, User as UserType } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type VerificationStatus = "not_started" | "pending" | "approved" | "rejected";

interface VerificationRequest {
  id: string;
  status: VerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  canResubmit?: boolean;
}

const TEACHING_LEVELS = [
  "Primary Education",
  "Middle School",
  "Secondary School",
];

const TEACHING_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Arabic Language",
  "French Language",
  "English Language",
  "History",
  "Geography",
  "Philosophy",
  "Islamic Education",
  "Economics",
  "Physical Education",
  "Arts",
  "Music",
  "Other",
];

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "verification" | "security">("info");
  
  // Verification states
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("not_started");
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationWizard, setShowVerificationWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Identity
  const [identityData, setIdentityData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    country: "Tunisia",
    idType: "national_id" as "national_id" | "passport" | "driver_license",
    idNumber: "",
  });

  // Step 2: Professional Information
  const [professionalData, setProfessionalData] = useState({
    institution: "",
    institutionEmail: "",
    role: "teacher" as "teacher" | "tutor",
    yearsOfExperience: "",
    teachingLevels: [] as string[],
    subjects: [] as string[],
    professionalLicense: "",
  });

  // Step 3: Documents
  const [documents, setDocuments] = useState({
    identityDoc: null as File | null,
    professionalDoc: null as File | null,
    qualificationDoc: null as File | null,
  });

  // Step 4: Video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
    if (currentUser) {
      // Pre-fill identity data
      const names = currentUser.fullName?.split(" ") || [];
      setIdentityData(prev => ({
        ...prev,
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
      }));
      // Only fetch verification status for teachers
      if (currentUser.role === "teacher") {
        fetchVerificationStatus();
      }
    }
  }, []);

  const fetchVerificationStatus = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/verification/my-request`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.request) {
          setVerificationRequest(data.request);
          setVerificationStatus(data.request.status);
        } else {
          setVerificationStatus("not_started");
        }
      }
    } catch (error) {
      console.error("Failed to fetch verification status:", error);
    }
  };

  const generateVerificationCode = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/verification/generate-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationCode(data.code);
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!documents.identityDoc || !documents.professionalDoc || !videoFile) {
      alert("Please upload all required documents and verification video");
      return;
    }

    setIsSubmitting(true);
    const token = authService.getToken();
    if (!token) return;

    try {
      // Step 1: Upload all files first to get URLs
      const documentUrls: string[] = [];
      
      console.log('Starting file uploads...');
      
      // Upload identity document
      const identityFormData = new FormData();
      identityFormData.append('files', documents.identityDoc);
      console.log('Uploading identity document:', documents.identityDoc.name, documents.identityDoc.type);
      
      let identityResponse;
      try {
        identityResponse = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: identityFormData,
        });
      } catch (fetchError: any) {
        console.error('Network error during identity upload:', fetchError);
        throw new Error(
          'Cannot connect to server. Please check:\n' +
          '1. Backend server is running (http://localhost:3000)\n' +
          '2. Your internet connection\n' +
          '3. File size is not too large\n\n' +
          `Error: ${fetchError?.message || 'Unknown network error'}`
        );
      }
      
      if (!identityResponse.ok) {
        const errorText = await identityResponse.text();
        console.error('Identity upload failed:', identityResponse.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(`Failed to upload identity document: ${errorData.message || identityResponse.statusText}`);
      }
      const identityData = await identityResponse.json();
      console.log('Identity upload response:', identityData);
      documentUrls.push(identityData.documents[0].storageUrl);

      // Upload professional document
      const professionalFormData = new FormData();
      professionalFormData.append('files', documents.professionalDoc);
      const professionalResponse = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: professionalFormData,
      });
      
      if (!professionalResponse.ok) {
        const errorText = await professionalResponse.text();
        console.error('Professional doc upload failed:', professionalResponse.status, errorText);
        throw new Error(`Failed to upload professional document: ${professionalResponse.status}`);
      }
      
      const professionalUploadData = await professionalResponse.json();
      console.log('Professional doc upload response:', professionalUploadData);
      
      // Check for validation errors
      if (professionalUploadData.errors && professionalUploadData.errors.length > 0) {
        console.error('Professional doc validation errors:', professionalUploadData.errors);
        throw new Error(`Professional document upload failed: ${professionalUploadData.errors.join(', ')}`);
      }
      
      // Validate response structure
      if (!professionalUploadData.documents || professionalUploadData.documents.length === 0) {
        console.error('No documents in response:', professionalUploadData);
        throw new Error('Professional document upload failed - no document was created');
      }
      
      if (!professionalUploadData.documents[0].storageUrl) {
        console.error('Missing storageUrl:', professionalUploadData.documents[0]);
        throw new Error('Professional document upload incomplete - missing storage URL');
      }
      
      documentUrls.push(professionalUploadData.documents[0].storageUrl);

      // Upload qualification document if provided
      if (documents.qualificationDoc) {
        const qualificationFormData = new FormData();
        qualificationFormData.append('files', documents.qualificationDoc);
        const qualificationResponse = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: qualificationFormData,
        });
        
        if (!qualificationResponse.ok) {
          const errorText = await qualificationResponse.text();
          console.error('Qualification doc upload failed:', qualificationResponse.status, errorText);
          throw new Error(`Failed to upload qualification document: ${qualificationResponse.status}`);
        }
        
        const qualificationUploadData = await qualificationResponse.json();
        console.log('Qualification doc upload response:', qualificationUploadData);
        
        // Check for validation errors
        if (qualificationUploadData.errors && qualificationUploadData.errors.length > 0) {
          console.error('Qualification doc validation errors:', qualificationUploadData.errors);
          throw new Error(`Qualification document upload failed: ${qualificationUploadData.errors.join(', ')}`);
        }
        
        // Validate response structure
        if (!qualificationUploadData.documents || qualificationUploadData.documents.length === 0) {
          console.error('No documents in response:', qualificationUploadData);
          throw new Error('Qualification document upload failed - no document was created');
        }
        
        if (!qualificationUploadData.documents[0].storageUrl) {
          console.error('Missing storageUrl:', qualificationUploadData.documents[0]);
          throw new Error('Qualification document upload incomplete - missing storage URL');
        }
        
        documentUrls.push(qualificationUploadData.documents[0].storageUrl);
      }

      // Upload video
      const videoFormData = new FormData();
      videoFormData.append('files', videoFile);
      const videoResponse = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: videoFormData,
      });
      
      // Check HTTP status
      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error('Video upload failed with status:', videoResponse.status, errorText);
        throw new Error(`Failed to upload verification video: ${videoResponse.status} ${errorText}`);
      }
      
      // Parse response
      const videoUploadData = await videoResponse.json();
      console.log('Video upload response:', videoUploadData);
      
      // Check for validation errors in response
      if (videoUploadData.errors && videoUploadData.errors.length > 0) {
        console.error('Video upload validation errors:', videoUploadData.errors);
        throw new Error(`Video upload failed: ${videoUploadData.errors.join(', ')}`);
      }
      
      // Validate response structure
      if (!videoUploadData.documents || videoUploadData.documents.length === 0) {
        console.error('No documents in upload response:', videoUploadData);
        throw new Error('Video upload failed - no document was created. Please check the video file format and size.');
      }
      
      if (!videoUploadData.documents[0].storageUrl) {
        console.error('Missing storageUrl in document:', videoUploadData.documents[0]);
        throw new Error('Video upload incomplete - missing storage URL');
      }
      
      const verificationVideoUrl = videoUploadData.documents[0].storageUrl;

      // Step 2: Map teaching levels to backend enum
      // Primary Education -> primary
      // Middle School, Secondary School -> secondary
      let teachingLevel: 'primary' | 'secondary' | 'private_tutor' = 'secondary';
      if (professionalData.teachingLevels.includes('Primary Education')) {
        teachingLevel = 'primary';
      } else if (professionalData.role === 'tutor') {
        teachingLevel = 'private_tutor';
      }

      // Step 3: Submit verification request with URLs
      const verificationPayload = {
        fullName: `${identityData.firstName} ${identityData.lastName}`,
        institution: professionalData.institution,
        teachingLevel: teachingLevel,
        subjects: professionalData.subjects,
        documentUrls: documentUrls,
        verificationVideoUrl: verificationVideoUrl,
        verificationCode: verificationCode,
      };

      const response = await fetch(`${API_URL}/verification/request`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationPayload),
      });

      if (response.ok) {
        setShowVerificationWizard(false);
        setCurrentStep(1);
        setShowSuccessModal(true);
        fetchVerificationStatus();
      } else {
        const error = await response.json();
        if (response.status === 500 && error.message?.includes('foreign key')) {
          alert(`Your session is invalid. Please log out and log back in to continue.`);
        } else {
          alert(`Failed to submit: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("Failed to submit verification:", error);
      alert(`Failed to submit verification request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validation
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password must be at least 8 characters long" });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordMessage({ type: "error", text: "Password must contain at least one uppercase letter" });
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordMessage({ type: "error", text: "Password must contain at least one lowercase letter" });
      return;
    }

    if (!/\d/.test(newPassword)) {
      setPasswordMessage({ type: "error", text: "Password must contain at least one number" });
      return;
    }

    if (!/[@$!%*?&]/.test(newPassword)) {
      setPasswordMessage({ type: "error", text: "Password must contain at least one special character (@$!%*?&)" });
      return;
    }

    setIsChangingPassword(true);
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        setPasswordMessage({ type: "error", text: error.message || "Failed to change password" });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "An error occurred while changing password" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case "approved":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200">
            <BadgeCheck className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Verified Educator</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Verification Pending</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">Verification Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <ShieldCheck className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Not Verified</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-0 relative shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 p-8 rounded-t-3xl text-center relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
              
              {/* Success Icon */}
              <div className="relative mx-auto w-24 h-24 rounded-full bg-white flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle className="w-14 h-14 text-green-600" />
              </div>
              
              {/* Title */}
              <h2 className="text-3xl font-bold text-white mb-2">
                Successfully Submitted!
              </h2>
              
              {/* Subtitle */}
              <p className="text-green-50 text-sm">
                Your verification is now under review
              </p>
            </div>
            
            {/* Body */}
            <div className="p-8">
              {/* Message */}
              <p className="text-[#5a6b7f] text-center mb-6 leading-relaxed">
                Thank you for submitting your verification request. Our admin team will carefully review your documents and video, and notify you of the decision within <span className="font-semibold text-[#0d1b3e]">3-5 business days</span>.
              </p>
              
              {/* Timeline */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-blue-900 text-base">Review Timeline</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">Documents Submitted</p>
                      <p className="text-xs text-green-700">Your application is in our queue</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Identity Verification</p>
                      <p className="text-xs text-blue-700">Admin reviews ID and video (1-2 days)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-white">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Professional Review</p>
                      <p className="text-xs text-blue-700">Institution and credentials check (1-2 days)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BadgeCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Final Decision</p>
                      <p className="text-xs text-purple-700">You'll receive an email notification</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">Keep an eye on your inbox</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      We'll send updates to <span className="font-medium">{user?.email}</span>. Check your spam folder if you don't see our email.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#63b3ed] to-[#5a9fd8] text-white font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#edf0f7] p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white text-2xl font-bold">
              {user?.fullName?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0d1b3e]">{user?.fullName || "Loading..."}</h1>
              <p className="text-sm text-[#8899bb]">{user?.email}</p>
            </div>
          </div>
          {user?.role === "teacher" && getVerificationBadge()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#edf0f7]">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "info"
              ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
              : "text-[#8899bb] hover:text-[#0d1b3e]"
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Profile Information
        </button>
        {user?.role === "teacher" && (
          <button
            onClick={() => setActiveTab("verification")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "verification"
                ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
                : "text-[#8899bb] hover:text-[#0d1b3e]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 inline mr-2" />
            Verification
          </button>
        )}
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "security"
              ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
              : "text-[#8899bb] hover:text-[#0d1b3e]"
          }`}
        >
          <Lock className="w-4 h-4 inline mr-2" />
          Security
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="bg-white rounded-2xl border border-[#edf0f7] p-6">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8899bb] mb-2">Full Name</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f9faff] border border-[#edf0f7]">
                <User className="w-5 h-5 text-[#8899bb]" />
                <span className="text-[#0d1b3e]">{user?.fullName || "Not set"}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8899bb] mb-2">Email Address</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f9faff] border border-[#edf0f7]">
                <Mail className="w-5 h-5 text-[#8899bb]" />
                <span className="text-[#0d1b3e]">{user?.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8899bb] mb-2">Account Type</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f9faff] border border-[#edf0f7]">
                <ShieldCheck className="w-5 h-5 text-[#8899bb]" />
                <span className="text-[#0d1b3e] capitalize">{user?.role || "Teacher"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "verification" && user?.role === "teacher" && (
        <div className="bg-white rounded-2xl border border-[#edf0f7] p-6">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Profile Verification</h2>
          
          {verificationStatus === "not_started" || verificationStatus === "rejected" ? (
            <>
              {!showVerificationWizard ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Why verify your profile?</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Access AI-powered exam generation</li>
                      <li>• Verified badge on your profile</li>
                      <li>• Higher trust score from other educators</li>
                      <li>• Priority support</li>
                    </ul>
                  </div>

                  {verificationStatus === "rejected" && verificationRequest?.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{verificationRequest.rejectionReason}</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowVerificationWizard(true);
                      setCurrentStep(1);
                      generateVerificationCode();
                    }}
                    className="w-full py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
                  >
                    Start Verification Process
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step Indicator */}
                  <div className="flex items-center justify-between">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                            step < currentStep ? "bg-green-500 text-white" :
                            step === currentStep ? "bg-[#63b3ed] text-white" :
                            "bg-gray-200 text-gray-500"
                          }`}>
                            {step < currentStep ? <Check className="w-5 h-5" /> : step}
                          </div>
                          <span className="text-xs mt-1 text-[#8899bb]">
                            {step === 1 && "Identity"}
                            {step === 2 && "Professional"}
                            {step === 3 && "Documents"}
                            {step === 4 && "Video"}
                            {step === 5 && "Review"}
                          </span>
                        </div>
                        {step < 5 && (
                          <div className={`flex-1 h-1 mx-2 rounded transition-colors ${
                            step < currentStep ? "bg-green-500" : "bg-gray-200"
                          }`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Step 1: Identity */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[#0d1b3e]">Step 1: Identity Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#8899bb] mb-2">First Name *</label>
                          <input
                            type="text"
                            value={identityData.firstName}
                            onChange={(e) => setIdentityData({...identityData, firstName: e.target.value})}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#8899bb] mb-2">Last Name *</label>
                          <input
                            type="text"
                            value={identityData.lastName}
                            onChange={(e) => setIdentityData({...identityData, lastName: e.target.value})}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#8899bb] mb-2">Date of Birth *</label>
                          <input
                            type="date"
                            value={identityData.dateOfBirth}
                            onChange={(e) => setIdentityData({...identityData, dateOfBirth: e.target.value})}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#8899bb] mb-2">Country *</label>
                          <input
                            type="text"
                            value={identityData.country}
                            onChange={(e) => setIdentityData({...identityData, country: e.target.value})}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Government ID Type *</label>
                        <div className="space-y-2">
                          {[
                            { value: "national_id", label: "National ID" },
                            { value: "passport", label: "Passport" },
                            { value: "driver_license", label: "Driver License" },
                          ].map((type) => (
                            <label key={type.value} className="flex items-center gap-3 p-3 border border-[#edf0f7] rounded-lg cursor-pointer hover:border-[#63b3ed]">
                              <input
                                type="radio"
                                name="idType"
                                value={type.value}
                                checked={identityData.idType === type.value}
                                onChange={(e) => setIdentityData({...identityData, idType: e.target.value as any})}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-[#0d1b3e]">{type.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Government ID Number *</label>
                        <input
                          type="text"
                          value={identityData.idNumber}
                          onChange={(e) => setIdentityData({...identityData, idNumber: e.target.value})}
                          required
                          className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setShowVerificationWizard(false)}
                          className="flex-1 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setCurrentStep(2)}
                          disabled={!identityData.firstName || !identityData.lastName || !identityData.dateOfBirth || !identityData.idNumber}
                          className="flex-1 py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] disabled:opacity-50"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Professional Information */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[#0d1b3e]">Step 2: Professional Information</h3>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Institution / School *</label>
                        <input
                          type="text"
                          value={professionalData.institution}
                          onChange={(e) => setProfessionalData({...professionalData, institution: e.target.value})}
                          placeholder="e.g., Lycée Pilote de Tunis"
                          required
                          className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Institution Email (optional but recommended)</label>
                        <input
                          type="email"
                          value={professionalData.institutionEmail}
                          onChange={(e) => setProfessionalData({...professionalData, institutionEmail: e.target.value})}
                          placeholder="your.email@institution.tn"
                          className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Role *</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: "teacher", label: "Teacher" },
                            { value: "tutor", label: "Tutor" },
                          ].map((role) => (
                            <label key={role.value} className="flex items-center gap-3 p-3 border border-[#edf0f7] rounded-lg cursor-pointer hover:border-[#63b3ed]">
                              <input
                                type="radio"
                                name="role"
                                value={role.value}
                                checked={professionalData.role === role.value}
                                onChange={(e) => setProfessionalData({...professionalData, role: e.target.value as any})}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-[#0d1b3e]">{role.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Years of Experience *</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={professionalData.yearsOfExperience}
                          onChange={(e) => setProfessionalData({...professionalData, yearsOfExperience: e.target.value})}
                          required
                          className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Teaching Levels * (Select all that apply)</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-3 border border-[#edf0f7] rounded-lg">
                          {TEACHING_LEVELS.map((level) => (
                            <label key={level} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={professionalData.teachingLevels.includes(level)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setProfessionalData({
                                      ...professionalData,
                                      teachingLevels: [...professionalData.teachingLevels, level]
                                    });
                                  } else {
                                    setProfessionalData({
                                      ...professionalData,
                                      teachingLevels: professionalData.teachingLevels.filter(l => l !== level)
                                    });
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-[#0d1b3e]">{level}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Subjects * (Select all that apply)</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-3 border border-[#edf0f7] rounded-lg">
                          {TEACHING_SUBJECTS.map((subject) => (
                            <label key={subject} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={professionalData.subjects.includes(subject)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setProfessionalData({
                                      ...professionalData,
                                      subjects: [...professionalData.subjects, subject]
                                    });
                                  } else {
                                    setProfessionalData({
                                      ...professionalData,
                                      subjects: professionalData.subjects.filter(s => s !== subject)
                                    });
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-[#0d1b3e]">{subject}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8899bb] mb-2">Professional License (if applicable)</label>
                        <input
                          type="text"
                          value={professionalData.professionalLicense}
                          onChange={(e) => setProfessionalData({...professionalData, professionalLicense: e.target.value})}
                          placeholder="License number"
                          className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="flex-1 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff]"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => setCurrentStep(3)}
                          disabled={!professionalData.institution || !professionalData.yearsOfExperience || professionalData.teachingLevels.length === 0 || professionalData.subjects.length === 0}
                          className="flex-1 py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] disabled:opacity-50"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Document Upload */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[#0d1b3e]">Step 3: Document Verification</h3>
                      
                      {/* Identity Document - Required */}
                      <div className="border border-[#edf0f7] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-red-500" />
                          <h4 className="font-medium text-[#0d1b3e]">Identity Document (Required)</h4>
                        </div>
                        <p className="text-sm text-[#8899bb] mb-3">
                          Accepted: ✓ National ID ✓ Passport
                          <br />
                          <span className="text-xs">Maximum 10 MB | PDF, JPG, PNG</span>
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 10 * 1024 * 1024) {
                              setDocuments({...documents, identityDoc: file});
                            } else {
                              alert("File must be 10 MB or smaller");
                            }
                          }}
                          className="w-full text-sm"
                        />
                        {documents.identityDoc && (
                          <div className="mt-2 flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{documents.identityDoc.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Professional Document - Required */}
                      <div className="border border-[#edf0f7] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-red-500" />
                          <h4 className="font-medium text-[#0d1b3e]">Professional Verification (Required)</h4>
                        </div>
                        <p className="text-sm text-[#8899bb] mb-3">
                          Upload one of:
                          <br />• Teacher Professional Card
                          <br />• School Employment Certificate (Attestation de Travail)
                          <br />• Ministry of Education Appointment Decision (Décision de Nomination)
                          <br />• Assignment Decision (Décision d'Affectation)
                          <br />• Current School Employment Contract
                          <br />
                          <span className="text-xs">Maximum 10 MB | PDF, JPG, PNG</span>
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 10 * 1024 * 1024) {
                              setDocuments({...documents, professionalDoc: file});
                            } else {
                              alert("File must be 10 MB or smaller");
                            }
                          }}
                          className="w-full text-sm"
                        />
                        {documents.professionalDoc && (
                          <div className="mt-2 flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{documents.professionalDoc.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Qualification Document - Optional */}
                      <div className="border border-[#edf0f7] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <h4 className="font-medium text-[#0d1b3e]">Teaching Qualification (Optional)</h4>
                        </div>
                        <p className="text-sm text-[#8899bb] mb-3">
                          Upload one of:
                          <br />• Licence in the teaching subject
                          <br />• Master's Degree
                          <br />• CAPES
                          <br />• Pedagogical Training Certificate
                          <br />• ISCE Diploma (if applicable)
                          <br />• Any recognized teaching qualification
                          <br />
                          <span className="text-xs">Maximum 10 MB | PDF, JPG, PNG</span>
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 10 * 1024 * 1024) {
                              setDocuments({...documents, qualificationDoc: file});
                            } else {
                              alert("File must be 10 MB or smaller");
                            }
                          }}
                          className="w-full text-sm"
                        />
                        {documents.qualificationDoc && (
                          <div className="mt-2 flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{documents.qualificationDoc.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="flex-1 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff]"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => setCurrentStep(4)}
                          disabled={!documents.identityDoc || !documents.professionalDoc}
                          className="flex-1 py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] disabled:opacity-50"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Video Verification */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[#0d1b3e]">Step 4: Video Verification</h3>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-3">📹 Video Instructions (Please read carefully)</h4>
                        <div className="text-sm text-blue-700 space-y-2">
                          <p className="font-medium">Record a 15–30 second video where you:</p>
                          <ul className="space-y-1 ml-4">
                            <li>✅ Show your face clearly</li>
                            <li>✅ Hold your ID next to your face</li>
                            <li>✅ Clearly say your verification code out loud: <strong className="text-lg font-mono">{verificationCode}</strong></li>
                            <li>✅ Rotate your head left and right</li>
                            <li>✅ Smile</li>
                            <li>✅ Show the ID for 5 seconds</li>
                          </ul>
                          <p className="mt-3 pt-3 border-t border-blue-300">
                            <strong>Note:</strong> Your verification code is unique to you.
                            <br />
                            <strong>Limits:</strong> Maximum 30 MB | Maximum 45 seconds | MP4 only
                          </p>
                        </div>
                      </div>

                      <div className="border border-[#edf0f7] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Video className="w-5 h-5 text-[#63b3ed]" />
                          <h4 className="font-medium text-[#0d1b3e]">Upload Verification Video *</h4>
                        </div>
                        <input
                          type="file"
                          accept="video/mp4"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 30 * 1024 * 1024) {
                                alert("Video must be 30 MB or smaller");
                                return;
                              }
                              if (!file.type.includes("mp4")) {
                                alert("Only MP4 format is accepted");
                                return;
                              }
                              setVideoFile(file);
                            }
                          }}
                          className="w-full text-sm"
                        />
                        {videoFile && (
                          <div className="mt-3 flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="flex-1 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff]"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => setCurrentStep(5)}
                          disabled={!videoFile}
                          className="flex-1 py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] disabled:opacity-50"
                        >
                          Review →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Review & Submit */}
                  {currentStep === 5 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[#0d1b3e]">Step 5: Review & Submit</h3>
                      
                      <div className="space-y-3">
                        {/* Identity Summary */}
                        <div className="border border-[#edf0f7] rounded-lg p-4">
                          <h4 className="font-medium text-[#0d1b3e] mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            Identity
                          </h4>
                          <div className="text-sm space-y-1 text-[#8899bb]">
                            <p>Name: <span className="text-[#0d1b3e]">{identityData.firstName} {identityData.lastName}</span></p>
                            <p>Date of Birth: <span className="text-[#0d1b3e]">{identityData.dateOfBirth}</span></p>
                            <p>ID Type: <span className="text-[#0d1b3e] capitalize">{identityData.idType.replace('_', ' ')}</span></p>
                            <p>ID Number: <span className="text-[#0d1b3e]">{identityData.idNumber}</span></p>
                          </div>
                        </div>

                        {/* Professional Summary */}
                        <div className="border border-[#edf0f7] rounded-lg p-4">
                          <h4 className="font-medium text-[#0d1b3e] mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            Professional
                          </h4>
                          <div className="text-sm space-y-1 text-[#8899bb]">
                            <p>Institution: <span className="text-[#0d1b3e]">{professionalData.institution}</span></p>
                            <p>Role: <span className="text-[#0d1b3e] capitalize">{professionalData.role}</span></p>
                            <p>Experience: <span className="text-[#0d1b3e]">{professionalData.yearsOfExperience} years</span></p>
                            <p>Teaching Levels: <span className="text-[#0d1b3e]">{professionalData.teachingLevels.join(", ")}</span></p>
                            <p>Subjects: <span className="text-[#0d1b3e]">{professionalData.subjects.join(", ")}</span></p>
                          </div>
                        </div>

                        {/* Documents Summary */}
                        <div className="border border-[#edf0f7] rounded-lg p-4">
                          <h4 className="font-medium text-[#0d1b3e] mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            Documents
                          </h4>
                          <div className="text-sm space-y-1">
                            <p className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Identity Document uploaded
                            </p>
                            <p className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Professional Document uploaded
                            </p>
                            {documents.qualificationDoc && (
                              <p className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Qualification Document uploaded
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Video Summary */}
                        <div className="border border-[#edf0f7] rounded-lg p-4">
                          <h4 className="font-medium text-[#0d1b3e] mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            Video
                          </h4>
                          <div className="text-sm space-y-1">
                            <p className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Verification video uploaded
                            </p>
                            <p className="text-[#8899bb]">Verification Code: <span className="text-[#0d1b3e] font-mono font-medium">{verificationCode}</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Please review all information carefully.</strong> Once submitted, your verification request will be reviewed by our admin team. You will receive a notification via email once the review is complete.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setCurrentStep(4)}
                          className="flex-1 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff]"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={handleVerificationSubmit}
                          disabled={isSubmitting}
                          className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSubmitting ? "Submitting..." : "Submit Verification"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : verificationStatus === "pending" ? (
            <div className="space-y-6">
              <div className="text-center py-6">
                <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">Verification in Progress</h3>
                <p className="text-sm text-[#8899bb]">
                  Your verification request is being reviewed by our admin team.
                  <br />
                  You'll receive an email notification once it's processed.
                </p>
                {verificationRequest?.submittedAt && (
                  <p className="text-xs text-[#aab4cc] mt-4">
                    Submitted on {new Date(verificationRequest.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Verification Timeline */}
              <div className="border border-[#edf0f7] rounded-lg p-6">
                <h4 className="font-medium text-[#0d1b3e] mb-6">Verification Timeline</h4>
                <div className="space-y-4">
                  {/* Step 1: Submitted */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-[#0d1b3e]">Submitted</h5>
                      <p className="text-sm text-[#8899bb]">Your verification request has been received</p>
                    </div>
                  </div>
                  <div className="ml-4 h-8 w-0.5 bg-green-500" />

                  {/* Step 2: Documents Uploaded */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-[#0d1b3e]">Documents Uploaded</h5>
                      <p className="text-sm text-[#8899bb]">All required documents have been submitted</p>
                    </div>
                  </div>
                  <div className="ml-4 h-8 w-0.5 bg-gray-300" />

                  {/* Step 3: Identity Review */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-[#0d1b3e]">Identity Review</h5>
                      <p className="text-sm text-[#8899bb]">Admin is verifying your identity documents</p>
                    </div>
                  </div>
                  <div className="ml-4 h-8 w-0.5 bg-gray-300" />

                  {/* Step 4: Professional Review */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-white">4</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-[#8899bb]">Professional Review</h5>
                      <p className="text-sm text-[#8899bb]">Verification of teaching credentials</p>
                    </div>
                  </div>
                  <div className="ml-4 h-8 w-0.5 bg-gray-300" />

                  {/* Step 5: Final Decision */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-white">5</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-[#8899bb]">Final Decision</h5>
                      <p className="text-sm text-[#8899bb]">You'll be notified of the outcome</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">Profile Verified!</h3>
              <p className="text-sm text-[#8899bb]">
                Your educator status has been verified. You now have full access to all platform features.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-[#edf0f7] p-6">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Change Password</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-[#8899bb] mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8899bb] hover:text-[#0d1b3e]"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#8899bb] mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8899bb] hover:text-[#0d1b3e]"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= getPasswordStrength(newPassword)
                            ? getPasswordStrength(newPassword) === 1
                              ? "bg-red-500"
                              : getPasswordStrength(newPassword) === 2
                              ? "bg-yellow-500"
                              : getPasswordStrength(newPassword) === 3
                              ? "bg-blue-500"
                              : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    getPasswordStrength(newPassword) === 1 ? "text-red-600" :
                    getPasswordStrength(newPassword) === 2 ? "text-yellow-600" :
                    getPasswordStrength(newPassword) === 3 ? "text-blue-600" :
                    "text-green-600"
                  }`}>
                    {getPasswordStrength(newPassword) === 1 && "Weak password"}
                    {getPasswordStrength(newPassword) === 2 && "Fair password"}
                    {getPasswordStrength(newPassword) === 3 && "Good password"}
                    {getPasswordStrength(newPassword) === 4 && "Strong password"}
                  </p>
                </div>
              )}

              {/* Password Requirements Checklist */}
              {newPassword && (
                <div className="mt-3 space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-xs">
                    {newPassword.length >= 8 ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={newPassword.length >= 8 ? "text-green-700" : "text-gray-600"}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {/[A-Z]/.test(newPassword) ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={/[A-Z]/.test(newPassword) ? "text-green-700" : "text-gray-600"}>
                      One uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {/[a-z]/.test(newPassword) ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={/[a-z]/.test(newPassword) ? "text-green-700" : "text-gray-600"}>
                      One lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {/\d/.test(newPassword) ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={/\d/.test(newPassword) ? "text-green-700" : "text-gray-600"}>
                      One number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {/[@$!%*?&]/.test(newPassword) ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={/[@$!%*?&]/.test(newPassword) ? "text-green-700" : "text-gray-600"}>
                      One special character (@$!%*?&)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#8899bb] mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8899bb] hover:text-[#0d1b3e]"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Passwords match
                </p>
              )}
            </div>

            {passwordMessage && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span
                  className={`text-sm ${
                    passwordMessage.type === "success" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {passwordMessage.text}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-3 rounded-lg bg-[#0d1b3e] text-white font-medium hover:bg-[#1a2d5a] transition-colors disabled:opacity-50"
            >
              {isChangingPassword ? "Changing Password..." : "Change Password"}
            </button>
          </form>

        </div>
      )}
    </div>
  );

  // Helper function for password strength calculation
  function getPasswordStrength(password: string): number {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
  }
}
