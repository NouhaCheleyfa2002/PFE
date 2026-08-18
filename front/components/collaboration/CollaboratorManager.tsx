"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, X, Settings, Check, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

interface Collaborator {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  role: 'owner' | 'editor' | 'viewer' | 'reviewer';
  status: 'pending' | 'accepted' | 'declined' | 'removed';
  permissions?: {
    edit?: boolean;
    analytics?: boolean;
    revenue?: number;
  };
  invitedAt: Date;
  acceptedAt?: Date;
}

interface CollaboratorManagerProps {
  resourceId: string;
  resourceType: 'document' | 'exam';
  isOwner: boolean;
}

export default function CollaboratorManager({ 
  resourceId, 
  resourceType,
  isOwner 
}: CollaboratorManagerProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
  }, [resourceId, resourceType]);

  const fetchCollaborators = async () => {
    try {
      const endpoint = resourceType === 'document' 
        ? `/collaboration/resources/${resourceId}/collaborators`
        : `/collaboration/exams/${resourceId}/collaborators`;
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    // Only owner can remove collaborators
    if (!isOwner) {
      toast.error('Only the exam owner can remove collaborators');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    try {
      const endpoint = resourceType === 'document' 
        ? `/collaboration/resources/collaborators/${collaboratorId}`
        : `/collaboration/exams/collaborators/${collaboratorId}`;
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Collaborator removed');
        fetchCollaborators();
      } else {
        toast.error('Failed to remove collaborator');
      }
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const getRoleDisplay = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700' },
      editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700' },
      viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-700' },
      reviewer: { label: 'Reviewer', color: 'bg-green-100 text-green-700' },
    };
    return roles[role] || roles.viewer;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaborators ({collaborators.filter(c => c.status === 'accepted').length})
        </h3>
        {isOwner && (
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Collaborator
          </button>
        )}
      </div>

      {/* Collaborators List */}
      {collaborators.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No collaborators yet</p>
          {isOwner && (
            <p className="text-sm text-gray-400 mt-1">
              Add collaborators to work together
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collab) => {
            const roleDisplay = getRoleDisplay(collab.role);
            return (
              <div
                key={collab.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-700">
                      {(collab.userName || collab.userEmail || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{collab.userName || collab.userEmail || 'Unknown User'}</p>
                      {getStatusIcon(collab.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleDisplay.color}`}>
                        {roleDisplay.label}
                      </span>
                      {collab.status === 'pending' && (
                        <span className="text-xs text-gray-500">Invitation pending</span>
                      )}
                      {collab.permissions?.revenue && (
                        <span className="text-xs text-gray-500">
                          {collab.permissions.revenue}% revenue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && collab.role !== 'owner' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemove(collab.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove collaborator"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Collaborator Dialog */}
      {showDialog && (
        <AddCollaboratorDialog
          resourceId={resourceId}
          resourceType={resourceType}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            setShowDialog(false);
            fetchCollaborators();
          }}
        />
      )}
    </div>
  );
}

// Add Collaborator Dialog Component
interface AddCollaboratorDialogProps {
  resourceId: string;
  resourceType: 'document' | 'exam';
  onClose: () => void;
  onSuccess: () => void;
}

function AddCollaboratorDialog({ 
  resourceId, 
  resourceType, 
  onClose, 
  onSuccess 
}: AddCollaboratorDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState<'editor' | 'viewer' | 'reviewer'>('editor');
  const [permissions, setPermissions] = useState({
    edit: true,
    analytics: true,
    revenue: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3000/auth/users/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleInvite = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const endpoint = resourceType === 'document' 
        ? `/collaboration/resources/${resourceId}/collaborators`
        : `/collaboration/exams/${resourceId}/collaborators`;
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          role,
          permissions: resourceType === 'document' ? permissions : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Collaborator invited successfully');
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to invite collaborator');
      }
    } catch (error) {
      console.error('Failed to invite collaborator:', error);
      toast.error('Failed to invite collaborator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Add Collaborator</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Users */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search for verified teachers
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter name or email..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
            {searchResults.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedUser?.id === user.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-medium text-gray-900">{user.fullName}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                {user.isVerified && (
                  <span className="text-xs text-blue-600">✓ Verified</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Role Selection */}
        {selectedUser && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="editor">Editor - Can edit and modify</option>
              <option value="viewer">Viewer - Can only view</option>
              {resourceType === 'exam' && (
                <option value="reviewer">Reviewer - Can view and comment</option>
              )}
            </select>
          </div>
        )}

        {/* Permissions for Documents */}
        {selectedUser && resourceType === 'document' && role !== 'viewer' && (
          <div className="mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={permissions.edit}
                onChange={(e) => setPermissions({ ...permissions, edit: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Can edit metadata and upload versions</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={permissions.analytics}
                onChange={(e) => setPermissions({ ...permissions, analytics: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Can view analytics</span>
            </label>
            <div>
              <label className="text-sm block mb-1">Revenue share (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={permissions.revenue}
                onChange={(e) => setPermissions({ ...permissions, revenue: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!selectedUser || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Inviting...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
