import { useState, useEffect } from "react";
import { checkTemplateLimit } from "@/lib/api/templates";

/**
 * useTemplateLimit Hook
 * 
 * Monitors template count and enforces the premium limit (10 templates).
 * Used to prevent template creation when limit is reached.
 * 
 * Requirements: 17.4, 17.5 (Task 14.4)
 */

interface TemplateLimit {
  count: number;
  limit: number;
  canCreate: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTemplateLimit(): TemplateLimit {
  const [count, setCount] = useState(0);
  const [limit] = useState(10); // Premium limit
  const [canCreate, setCanCreate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkTemplateLimit();
      setCount(result.count);
      setCanCreate(result.canCreate);
    } catch (err: any) {
      console.error("Failed to check template limit:", err);
      setError(err.message || "Failed to check template limit");
      // Assume can create if check fails (fail-open for better UX)
      setCanCreate(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLimit();
  }, []);

  return {
    count,
    limit,
    canCreate,
    isLoading,
    error,
    refresh: fetchLimit,
  };
}
