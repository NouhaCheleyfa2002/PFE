"use client";

import React from "react";
import { useResources, Resource } from "@/lib/resources-context";
import { FileText, Eye, Trash2, Star, Upload } from "lucide-react";

export default function ResourcesPage() {
  const { resources, deleteResource } = useResources();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
            My Resources
          </h1>
          <p className="text-sm text-[#8899bb] mt-1">Manage your uploaded courses and materials</p>
        </div>
        <a
          href="/dashboard/upload"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1b3e] text-white text-sm font-semibold hover:bg-[#1a2d5a] transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload New
        </a>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f6f8ff] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#8899bb]" />
          </div>
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No resources yet</h2>
          <p className="text-sm text-[#8899bb] mb-6 max-w-md mx-auto">
            Start sharing your educational materials with the community by uploading your first resource.
          </p>
          <a
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63b3ed] text-white text-sm font-semibold hover:bg-[#4299e1] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Your First Resource
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#edf0f7] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#edf0f7] bg-[#f9faff]">
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#8899bb]">Resource</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#8899bb]">Type</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#8899bb]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#8899bb]">Views</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#8899bb]">Downloads</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#8899bb]">Rating</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r: Resource) => (
                <tr key={r.id} className="border-b border-[#f4f6fc] hover:bg-[#f9faff] transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-[#0d1b3e]">{r.title}</p>
                      <p className="text-xs text-[#8899bb] mt-0.5">
                        {r.subject} - {r.level} - {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{r.type}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      r.status === "Published" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#4a5568]">{r.views}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5568]">{r.downloads}</td>
                  <td className="px-5 py-4">
                    {r.rating > 0 ? (
                      <span className="flex items-center gap-1 text-sm text-amber-600">
                        <Star className="w-4 h-4 fill-amber-500" />
                        {r.rating}
                      </span>
                    ) : (
                      <span className="text-sm text-[#aab4cc]">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-[#edf0f7] text-[#63b3ed] transition-colors"
                        title="View file"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this resource?")) {
                            deleteResource(r.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
