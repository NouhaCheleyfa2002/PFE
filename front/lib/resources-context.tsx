"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { authService } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface Resource {
  id: string;
  userId: string;
  title: string;
  subject: string;
  level: string;
  type: string;
  keywords: string;
  description: string;
  license: "free" | "paid";
  price: string;
  fileUrl: string;
  fileName: string;
  fid: string;
  fileSize: number;
  status: "Published" | "Draft";
  views: number;
  downloads: number;
  rating: number;
  createdAt: string;
}

interface ResourcesContextType {
  resources: Resource[];
  loading: boolean;
  addResource: (resource: Omit<Resource, "id" | "userId" | "views" | "downloads" | "rating" | "createdAt" | "status">) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  refreshResources: () => Promise<void>;
}

const ResourcesContext = createContext<ResourcesContextType | undefined>(undefined);

export function ResourcesProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ResourcesContext] Fetched documents:', data);
        
        // Map backend documents to Resource format
        const mappedResources: Resource[] = (data.documents || []).map((doc: any) => ({
          id: doc.id,
          userId: data.userId, // Use userId from response
          title: doc.title || doc.originalName || 'Untitled',
          subject: doc.subject || 'General',
          level: doc.classLevel || doc.level || 'Unknown',
          type: doc.resourceType || 'Course Material',
          keywords: Array.isArray(doc.keywords) ? doc.keywords.join(', ') : (doc.keywords || ''),
          description: doc.description || '',
          license: doc.license || 'free',
          price: doc.price?.toString() || '0',
          fileUrl: doc.storageUrl || '',
          fileName: doc.originalName || 'document.pdf',
          fid: doc.id,
          fileSize: doc.fileSize || 0,
          status: doc.status === 'completed' ? 'Published' : 'Draft',
          views: doc.views || 0,
          downloads: doc.downloads || 0,
          rating: 0, // TODO: Add to backend
          createdAt: doc.createdAt || new Date().toISOString(),
        }));

        setResources(mappedResources);
      } else {
        console.error('[ResourcesContext] Failed to fetch documents:', response.status);
      }
    } catch (error) {
      console.error('[ResourcesContext] Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const addResource = (resource: Omit<Resource, "id" | "userId" | "views" | "downloads" | "rating" | "createdAt" | "status">) => {
    // For now, just add locally - the upload process handles backend
    // This will be synced when fetchResources is called again
    const newResource: Resource = {
      ...resource,
      id: `resource_${Date.now()}`,
      userId: authService.getUser()?.id || '',
      status: "Published",
      views: 0,
      downloads: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    setResources((prev) => [newResource, ...prev]);
  };

  const updateResource = async (id: string, updates: Partial<Resource>) => {
    // Update local state immediately for UI responsiveness
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );

    const token = authService.getToken();
    if (!token) return;

    try {
      // If updating views or downloads, don't send to metadata endpoint
      if (updates.views !== undefined || updates.downloads !== undefined) {
        // These are tracked by separate endpoints, just update local state
        return;
      }

      // Update other metadata in backend
      const response = await fetch(`${API_URL}/documents/${id}/metadata`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: updates.title,
          classLevel: updates.level,
          subject: updates.subject,
          resourceType: updates.type,
          keywords: updates.keywords ? updates.keywords.split(',').map(k => k.trim()) : undefined,
          description: updates.description,
          license: updates.license,
          price: updates.price ? parseFloat(updates.price) : undefined,
        }),
      });

      if (!response.ok) {
        console.error('[ResourcesContext] Failed to update metadata');
        // Revert local changes if backend fails
        await fetchResources();
      }
    } catch (error) {
      console.error('[ResourcesContext] Error updating resource:', error);
      // Revert local changes if error
      await fetchResources();
    }
  };

  const deleteResource = async (id: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      // TODO: Add delete endpoint to backend
      // For now, just remove from local state
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('[ResourcesContext] Error deleting resource:', error);
    }
  };

  const refreshResources = async () => {
    await fetchResources();
  };

  return (
    <ResourcesContext.Provider value={{ resources, loading, addResource, updateResource, deleteResource, refreshResources }}>
      {children}
    </ResourcesContext.Provider>
  );
}

export function useResources() {
  const context = useContext(ResourcesContext);
  if (context === undefined) {
    throw new Error("useResources must be used within a ResourcesProvider");
  }
  return context;
}
