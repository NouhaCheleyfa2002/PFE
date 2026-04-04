"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  AlertCircle,
} from "lucide-react";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/* ── types ─────────────────────────────────────────────────────────────── */
interface Task {
  id: string | undefined;
  name: string;
  data: Record<string, unknown>;
  status: "active" | "completed" | "failed" | "waiting" | "delayed";
  attempts: number;
  createdAt: number;
  processedAt: number | undefined;
  finishedAt: number | undefined;
  failedReason: string | undefined;
}

interface Stats {
  active: number;
  completed: number;
  failed: number;
  waiting: number;
  delayed: number;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function statusBadge(status: Task["status"]) {
  const map: Record<Task["status"], { bg: string; text: string; icon: React.ReactNode }> = {
    active:    { bg: "bg-blue-500/15",   text: "text-blue-400",   icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { bg: "bg-green-500/15",  text: "text-green-400",  icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:    { bg: "bg-red-500/15",    text: "text-red-400",    icon: <XCircle className="w-3 h-3" /> },
    waiting:   { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: <Clock className="w-3 h-3" /> },
    delayed:   { bg: "bg-purple-500/15", text: "text-purple-400", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.waiting;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {s.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function fmt(ts: number | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" });
}

function StatCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-xl bg-white border border-[#e8edf5] p-4 flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#8898aa]">{label}</span>
      <span className={`text-3xl font-black ${colorClass}`}>{value}</span>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */
export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<Task["status"] | "all">("all");

  const fetchData = useCallback(async () => {
    const token = authService.getToken();
    if (!token) { router.push("/auth"); return; }

    const user = authService.getUser();
    if (user?.role !== "admin") { router.push("/dashboard"); return; }

    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [tasksRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/tasks`,       { headers }),
        fetch(`${API_URL}/admin/tasks/stats`, { headers }),
      ]);

      if (!tasksRes.ok || !statsRes.ok) throw new Error("Failed to fetch task data");

      const [tasksData, statsData] = await Promise.all([tasksRes.json(), statsRes.json()]);
      setTasks(tasksData);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f6ad55]/15 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#f6ad55]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0d1b3e]">Worker Tasks</h1>
            <p className="text-[13px] text-[#8898aa]">Live view of BullMQ notification-queue jobs</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-[#f6ad55]/10 text-[#f6ad55]
                     border border-[#f6ad55]/30 text-sm font-semibold hover:bg-[#f6ad55]/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Waiting"   value={stats.waiting}   colorClass="text-yellow-500" />
          <StatCard label="Active"    value={stats.active}    colorClass="text-blue-500" />
          <StatCard label="Completed" value={stats.completed} colorClass="text-green-500" />
          <StatCard label="Failed"    value={stats.failed}    colorClass="text-red-500" />
          <StatCard label="Delayed"   value={stats.delayed}   colorClass="text-purple-500" />
        </div>
      )}

      {/* filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "waiting", "active", "completed", "failed", "delayed"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
              filter === s
                ? "bg-[#0d1b3e] text-white border-[#0d1b3e]"
                : "bg-white text-[#5a7299] border-[#e8edf5] hover:border-[#0d1b3e]/30"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {stats && s !== "all" && (
              <span className="ml-1.5 opacity-60">{stats[s as keyof Stats]}</span>
            )}
          </button>
        ))}
      </div>

      {/* error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* task table */}
      <div className="rounded-xl border border-[#e8edf5] bg-white overflow-hidden">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#8898aa]">
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="text-sm">Loading tasks…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#8898aa]">
            <ClipboardList className="w-8 h-8 opacity-40" />
            <span className="text-sm">No tasks found</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8edf5] bg-[#f8fafc]">
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8898aa]">Job ID</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8898aa]">Name</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8898aa]">Data</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8898aa]">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8898aa]">Attempts</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8898aa]">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f8]">
              {filtered.map((task, i) => (
                <tr key={task.id ?? i} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3 font-mono text-[12px] text-[#8898aa]">
                    {task.id ? `#${task.id}` : "—"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[#0d1b3e]">{task.name}</td>
                  <td className="px-5 py-3 max-w-[200px]">
                    <span className="block truncate font-mono text-[11px] text-[#5a7299] bg-[#f0f4f8] px-2 py-1 rounded-md">
                      {JSON.stringify(task.data)}
                    </span>
                    {task.failedReason && (
                      <span className="block mt-1 text-[11px] text-red-500 truncate">{task.failedReason}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{statusBadge(task.status)}</td>
                  <td className="px-5 py-3 text-center text-[12px] text-[#8898aa]">{task.attempts}</td>
                  <td className="px-5 py-3 text-[12px] text-[#8898aa] whitespace-nowrap">{fmt(task.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-[#b0bad0] text-right">Auto-refreshes every 10 seconds</p>
    </div>
  );
}
