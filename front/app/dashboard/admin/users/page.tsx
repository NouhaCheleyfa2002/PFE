"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users as UsersIcon,
  Search,
  RefreshCw,
  ShieldCheck,
  User,
  GraduationCap,
  BadgeCheck,
  Clock,
  XCircle,
  Mail,
  Calendar,
  Ban,
  ShieldOff,
  Trash2,
  Edit,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: "teacher" | "student" | "admin";
  verified: boolean;
  verificationStatus?: string;
  university?: string;
  region?: string;
  specialty?: string;
  banned?: boolean;
  bannedReason?: string;
  restricted?: boolean;
  restrictionType?: string;
  restrictedReason?: string;
  createdAt: string;
}

function RoleBadge({ role }: { role: User["role"] }) {
  const configs = {
    admin: { bg: "bg-orange-100", text: "text-orange-700", icon: ShieldCheck, label: "Admin" },
    teacher: { bg: "bg-blue-100", text: "text-blue-700", icon: GraduationCap, label: "Teacher" },
    student: { bg: "bg-purple-100", text: "text-purple-700", icon: User, label: "Student" },
  };
  const config = configs[role];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function StatusBadge({ user }: { user: User }) {
  if (user.banned) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700" title={user.bannedReason}>
        <Ban className="w-3.5 h-3.5" />
        Banned
      </span>
    );
  }
  
  if (user.restricted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700" title={user.restrictedReason}>
        <ShieldOff className="w-3.5 h-3.5" />
        Restricted ({user.restrictionType})
      </span>
    );
  }

  // Admins don't need verification - they're inherently trusted
  if (user.role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
        <ShieldCheck className="w-3.5 h-3.5" />
        Admin
      </span>
    );
  }

  // Only show verified status for teachers and students
  if (user.verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <BadgeCheck className="w-3.5 h-3.5" />
        Verified
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      <XCircle className="w-3.5 h-3.5" />
      Active
    </span>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalRestrictionType, setModalRestrictionType] = useState("all");
  const [modalRole, setModalRole] = useState<string>("");

  const fetchUsers = async () => {
    const token = authService.getToken();
    if (!token) {
      router.push("/");
      return;
    }

    const user = authService.getUser();
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.university?.toLowerCase().includes(query) ||
          u.specialty?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const handleAction = async (action: string, user: User) => {
    setSelectedUser(user);
    setShowActionMenu(null);

    if (action === "ban" || action === "restrict" || action === "delete" || action === "role") {
      setShowModal(action);
      if (action === "role") setModalRole(user.role);
      return;
    }

    const token = authService.getToken();
    if (!token) return;

    try {
      let endpoint = "";
      let method = "PATCH";

      switch (action) {
        case "unban":
          endpoint = `/admin/users/${user.id}/unban`;
          break;
        case "unrestrict":
          endpoint = `/admin/users/${user.id}/unrestrict`;
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("Action completed successfully!");
        fetchUsers();
      } else {
        alert("Action failed!");
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed!");
    }
  };

  const submitModal = async () => {
    if (!selectedUser) return;

    const token = authService.getToken();
    if (!token) return;

    try {
      let endpoint = "";
      let method = "PATCH";
      let body: any = {};

      switch (showModal) {
        case "ban":
          endpoint = `/admin/users/${selectedUser.id}/ban`;
          body = { reason: modalReason };
          break;
        case "restrict":
          endpoint = `/admin/users/${selectedUser.id}/restrict`;
          body = { reason: modalReason, restrictionType: modalRestrictionType };
          break;
        case "delete":
          endpoint = `/admin/users/${selectedUser.id}`;
          method = "DELETE";
          body = { reason: modalReason };
          break;
        case "role":
          endpoint = `/admin/users/${selectedUser.id}/role`;
          body = { role: modalRole };
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert("Action completed successfully!");
        setShowModal(null);
        setModalReason("");
        setSelectedUser(null);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.message || "Action failed!");
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed!");
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    students: users.filter((u) => u.role === "student").length,
    banned: users.filter((u) => u.banned).length,
    restricted: users.filter((u) => u.restricted).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0d1b3e]">Users Management</h1>
            <p className="text-sm text-[#8899bb]">Manage all platform users</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium hover:bg-orange-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Total</p>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Admins</p>
          <p className="text-2xl font-bold text-orange-600">{stats.admins}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Teachers</p>
          <p className="text-2xl font-bold text-blue-600">{stats.teachers}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Students</p>
          <p className="text-2xl font-bold text-purple-600">{stats.students}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Banned</p>
          <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Restricted</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.restricted}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899bb]" />
          <input
            type="text"
            placeholder="Search by name, email, university..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed] text-sm"
          />
        </div>

        {/* Role Filter */}
        <div className="flex gap-2">
          {(["all", "admin", "teacher", "student"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                roleFilter === role
                  ? "bg-[#0d1b3e] text-white border-[#0d1b3e]"
                  : "bg-white text-[#5a7299] border-[#edf0f7] hover:border-[#0d1b3e]/30"
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#edf0f7] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8899bb]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8899bb]">
            <UsersIcon className="w-8 h-8 opacity-40 mb-2" />
            <span className="text-sm">No users found</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#edf0f7] bg-[#f8fafc]">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8899bb]">User</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8899bb]">Role</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8899bb]">Status</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8899bb]">Details</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8899bb]">Joined</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#8899bb]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f8]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold">
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0d1b3e]">{user.fullName}</p>
                        <p className="text-xs text-[#8899bb] flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge user={user} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs text-[#8899bb] space-y-0.5">
                      {user.university && (
                        <p className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {user.university}
                        </p>
                      )}
                      {user.specialty && (
                        <p className="flex items-center gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {user.specialty}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-[#8899bb] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showActionMenu === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowActionMenu(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#edf0f7] py-2 z-20">
                            {user.role !== "admin" && !user.banned && (
                              <button
                                onClick={() => handleAction("ban", user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                              >
                                <Ban className="w-4 h-4" />
                                Ban User
                              </button>
                            )}
                            {user.banned && (
                              <button
                                onClick={() => handleAction("unban", user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Unban User
                              </button>
                            )}
                            {user.role !== "admin" && !user.restricted && (
                              <button
                                onClick={() => handleAction("restrict", user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 text-yellow-600 flex items-center gap-2"
                              >
                                <ShieldOff className="w-4 h-4" />
                                Restrict User
                              </button>
                            )}
                            {user.restricted && (
                              <button
                                onClick={() => handleAction("unrestrict", user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Unrestrict User
                              </button>
                            )}
                            <button
                              onClick={() => handleAction("role", user)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Change Role
                            </button>
                            {user.role !== "admin" && (
                              <button
                                onClick={() => handleAction("delete", user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-[#edf0f7] mt-2 pt-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete User
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[#8899bb] text-right">Showing {filteredUsers.length} of {stats.total} users</p>

      {/* Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0d1b3e]">
                {showModal === "ban" && "Ban User"}
                {showModal === "restrict" && "Restrict User"}
                {showModal === "delete" && "Delete User"}
                {showModal === "role" && "Change User Role"}
              </h3>
              <button onClick={() => {
                setShowModal(null);
                setModalReason("");
                setSelectedUser(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">User: <span className="font-semibold">{selectedUser.fullName}</span></p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>

              {showModal === "role" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ) : (
                <>
                  {showModal === "restrict" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Restriction Type</label>
                      <select
                        value={modalRestrictionType}
                        onChange={(e) => setModalRestrictionType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="upload">Upload Only</option>
                        <option value="comment">Comment Only</option>
                        <option value="download">Download Only</option>
                        <option value="all">All Actions</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason {showModal !== "role" && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="Enter reason..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(null);
                    setModalReason("");
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitModal}
                  disabled={showModal !== "role" && !modalReason.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${
                    showModal === "delete"
                      ? "bg-red-600 hover:bg-red-700"
                      : showModal === "ban"
                      ? "bg-red-600 hover:bg-red-700"
                      : showModal === "restrict"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
