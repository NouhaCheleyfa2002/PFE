"use client";

import { useEffect, useState } from "react";
import { Users, Inbox, FileText, GraduationCap, Calendar } from "lucide-react";
import { InvitationModal } from "@/components/collaboration";

interface Invitation {
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
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<{ resources: Invitation[]; exams: Invitation[] }>({
    resources: [],
    exams: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3000/collaboration/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationRespond = () => {
    setSelectedInvitation(null);
    fetchInvitations();
  };

  const allInvitations = [...invitations.resources, ...invitations.exams];
  const totalCount = allInvitations.length;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Collaboration Invitations</h1>
              <p className="text-gray-600">
                {totalCount > 0 
                  ? `You have ${totalCount} pending invitation${totalCount > 1 ? 's' : ''}`
                  : 'You have no pending invitations'}
              </p>
            </div>
          </div>
        </div>

        {/* Invitations List */}
        {totalCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Pending Invitations</h2>
            <p className="text-gray-600">
              You'll see collaboration invitations from other teachers here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {allInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg ${
                      invitation.resourceType === 'exam' 
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {invitation.resourceType === 'exam' ? (
                        <GraduationCap className="w-6 h-6" />
                      ) : (
                        <FileText className="w-6 h-6" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invitation.resourceType === 'exam' ? 'Exam' : 'Resource'} Collaboration
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{invitation.invitedBy}</span> invited you to collaborate as{' '}
                            <span className="font-medium capitalize text-blue-600">{invitation.role}</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          invitation.resourceType === 'exam'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {invitation.resourceType === 'exam' ? 'Exam' : 'Resource'}
                        </span>
                      </div>

                      {/* Permissions Preview */}
                      {invitation.permissions && invitation.resourceType === 'document' && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {invitation.permissions.edit && (
                            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                              ✓ Can Edit
                            </span>
                          )}
                          {invitation.permissions.analytics && (
                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              ✓ View Analytics
                            </span>
                          )}
                          {invitation.permissions.revenue > 0 && (
                            <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                              {invitation.permissions.revenue}% Revenue
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(invitation.invitedAt)}</span>
                        </div>
                        <button
                          onClick={() => setSelectedInvitation(invitation)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                        >
                          View Invitation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitation Modal */}
      {selectedInvitation && (
        <InvitationModal
          invitation={selectedInvitation}
          onClose={() => setSelectedInvitation(null)}
          onRespond={handleInvitationRespond}
        />
      )}
    </div>
  );
}
