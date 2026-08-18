"use client";

import React, { useState, useEffect } from "react";
import { X, Check, XCircle, FileText, Users, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface InvitationModalProps {
  invitation: {
    id: string;
    resourceId: string;
    resourceType: 'document' | 'exam';
    role: string;
    permissions?: {
      edit: boolean;
      analytics: boolean;
      revenue: number;
    };
    invitedBy: string;
    invitedAt: Date | string;
    resourceTitle?: string;
    resourcePreview?: string;
  };
  onClose: () => void;
  onRespond: (action: 'accept' | 'decline') => void;
}

export default function InvitationModal({ invitation, onClose, onRespond }: InvitationModalProps) {
  const [responding, setResponding] = useState(false);
  const [message, setMessage] = useState("");
  const [resourceDetails, setResourceDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const router = useRouter();

  // Fetch resource details when modal opens
  useEffect(() => {
    fetchResourceDetails();
  }, [invitation.resourceId]);

  const fetchResourceDetails = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Use the preview endpoint that works for pending invitations
      const response = await fetch(
        `http://localhost:3000/collaboration/invitations/${invitation.id}/preview`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResourceDetails(data);
      } else {
        console.log('Cannot fetch resource preview');
      }
    } catch (error) {
      console.error('Failed to fetch resource details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRespond = async (action: 'accept' | 'decline') => {
    setResponding(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3000/collaboration/invitations/${invitation.id}/respond`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action,
            message: message.trim() || undefined 
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        toast.success(
          action === 'accept' 
            ? 'Invitation accepted! Redirecting...' 
            : 'Invitation declined'
        );
        
        onRespond(action);
        
        // Redirect to workspace after accepting
        if (action === 'accept' && result.redirectUrl) {
          setTimeout(() => {
            router.push(result.redirectUrl);
          }, 1500);
        } else {
          onClose();
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to respond to invitation');
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      toast.error('Failed to respond to invitation');
    } finally {
      setResponding(false);
    }
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      owner: 'Full control over the resource',
      editor: 'Can edit and modify the content',
      viewer: 'Can only view the content',
      reviewer: 'Can view and add comments',
    };
    return descriptions[role] || role;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Collaboration Invitation</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {invitation.invitedBy} invited you to collaborate
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resource Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-gray-600 mt-1" />
              <div className="flex-1">
                {loadingDetails ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {invitation.resourceType === 'exam' ? 'Exam' : 'Resource'}: {resourceDetails?.title || invitation.resourceTitle || 'Untitled'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Type: {invitation.resourceType === 'exam' ? 'Collaborative Exam' : 'Educational Resource'}
                    </p>
                    {resourceDetails?.ownerName && (
                      <p className="text-sm text-gray-600">Owner: {resourceDetails.ownerName}</p>
                    )}
                    {resourceDetails?.subject && (
                      <p className="text-sm text-gray-600">Subject: {resourceDetails.subject}</p>
                    )}
                    {resourceDetails?.level && (
                      <p className="text-sm text-gray-600">Level: {resourceDetails.level}</p>
                    )}
                    {resourceDetails?.classLevel && (
                      <p className="text-sm text-gray-600">Level: {resourceDetails.classLevel}</p>
                    )}
                    {(resourceDetails?.description || resourceDetails?.instructions || invitation.resourcePreview) && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                        {resourceDetails?.description || resourceDetails?.instructions || invitation.resourcePreview}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Document Preview (First Page) */}
          {resourceDetails?.type === 'document' && resourceDetails?.fileUrl && !loadingDetails && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Document Preview</h4>
              <div className="relative bg-white rounded-lg overflow-hidden border border-gray-300">
                <iframe
                  src={`${resourceDetails.fileUrl}#page=1&view=FitH`}
                  className="w-full h-96"
                  title="Document Preview"
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Preview of first page • Full access after accepting invitation
              </p>
            </div>
          )}

          {/* Role & Permissions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Role & Permissions
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="font-medium text-blue-900">Role</span>
                <span className="text-blue-700 capitalize font-semibold">{invitation.role}</span>
              </div>
              <p className="text-sm text-gray-600 px-3">
                {getRoleDescription(invitation.role)}
              </p>

              {invitation.permissions && invitation.resourceType === 'document' && (
                <div className="mt-3 space-y-2 px-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Can edit content</span>
                    <span className={invitation.permissions.edit ? 'text-green-600' : 'text-gray-400'}>
                      {invitation.permissions.edit ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Can view analytics</span>
                    <span className={invitation.permissions.analytics ? 'text-green-600' : 'text-gray-400'}>
                      {invitation.permissions.analytics ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  {invitation.permissions.revenue > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Revenue share</span>
                      <span className="text-green-600 font-semibold">
                        {invitation.permissions.revenue}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invitation Details */}
          <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t">
            <Calendar className="w-4 h-4" />
            <span>Invited on {formatDate(invitation.invitedAt)}</span>
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to the inviter..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={() => handleRespond('decline')}
              disabled={responding}
              className="flex-1 px-4 py-3 border-2 border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Decline
            </button>
            <button
              onClick={() => handleRespond('accept')}
              disabled={responding}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
              {responding ? 'Processing...' : 'Accept & Start Collaborating'}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            {invitation.resourceType === 'exam' 
              ? 'After accepting, you\'ll be taken to the exam workspace to start editing.'
              : 'After accepting, you\'ll have access to view and work on this resource.'}
          </p>
        </div>
      </div>
    </div>
  );
}
