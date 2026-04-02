"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Resource {
  id: string;
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
  addResource: (resource: Omit<Resource, "id" | "views" | "downloads" | "rating" | "createdAt" | "status">) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
}

const ResourcesContext = createContext<ResourcesContextType | undefined>(undefined);

const STORAGE_KEY = "pfe_resources";

export function ResourcesProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setResources(JSON.parse(stored));
      } catch {
        console.error("Failed to parse stored resources");
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when resources change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
    }
  }, [resources, isLoaded]);

  const addResource = (resource: Omit<Resource, "id" | "views" | "downloads" | "rating" | "createdAt" | "status">) => {
    const newResource: Resource = {
      ...resource,
      id: `resource_${Date.now()}`,
      status: "Published",
      views: 0,
      downloads: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    setResources((prev) => [newResource, ...prev]);
  };

  const updateResource = (id: string, updates: Partial<Resource>) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <ResourcesContext.Provider value={{ resources, addResource, updateResource, deleteResource }}>
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
