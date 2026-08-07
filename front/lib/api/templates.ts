/**
 * Template API Client
 * 
 * Provides functions for interacting with the exam template builder API.
 * Requirements: 10.1, 11.1, 12.1, API integration
 */

import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Layout settings for typography and alignment
 */
export interface LayoutSettings {
  institutionNameSize: number;
  institutionNameAlign: 'left' | 'center' | 'right';
  addressSize: number;
  addressAlign: 'left' | 'center' | 'right';
  contactSize: number;
  contactAlign: 'left' | 'center' | 'right';
  academicYearSize: number;
  academicYearAlign: 'left' | 'center' | 'right';
  headerSpacing: number;
  lineHeight: number;
  showInstitutionName: boolean;
  showAddress: boolean;
  showContact: boolean;
  showAcademicYear: boolean;
}

/**
 * Template response structure from backend
 */
export interface TemplateResponse {
  id: string;
  name: string;
  userId: string;
  institutionName?: string;
  institutionAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  academicYear?: string;
  logoUrl?: string;
  logoPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  pageOrientation: 'portrait' | 'landscape';
  footerText?: string;
  watermarkText?: string;
  watermarkOpacity: number;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  placeholders: Array<{
    key: string;
    label: string;
    position: { x: number; y: number };
    fontSize?: number;
    textColor?: string;
    showEmpty?: boolean;
    showUnderline?: boolean;
  }>;
  layoutSettings?: LayoutSettings;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Extracted metadata from AI analysis
 */
export interface ExtractedMetadata {
  institutionName?: string;
  institutionAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  academicYear?: string;
  logoUrl?: string;
  logoPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectedPlaceholders?: string[];
}

/**
 * Template creation payload
 */
export interface CreateTemplateDto {
  name: string;
  institutionName?: string;
  institutionAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  academicYear?: string;
  logoUrl?: string;
  logoPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageMargins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  pageOrientation?: 'portrait' | 'landscape';
  footerText?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  fontFamily?: string;
  primaryColor?: string;
  secondaryColor?: string;
  placeholders?: Array<{
    key: string;
    label: string;
    position: { x: number; y: number };
    fontSize?: number;
    textColor?: string;
    showEmpty?: boolean;
    showUnderline?: boolean;
  }>;
  layoutSettings?: LayoutSettings;
  isDefault?: boolean;
}

/**
 * Template update payload
 */
export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

/**
 * Exam data for applying a template
 */
export interface ExamData {
  title?: string;
  studentName?: string;
  teacher?: string;
  subject?: string;
  classLevel?: string;
  examDate?: string;
  duration?: string;
  academicYear?: string;
  totalMarks?: number;
}

/**
 * Handle API errors consistently
 */
function handleApiError(error: any): never {
  if (error.message) {
    throw new Error(error.message);
  }
  throw new Error('An unexpected error occurred');
}

/**
 * Get authorization headers
 */
function getAuthHeaders(): HeadersInit {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Get all templates for the authenticated user
 */
export async function getTemplates(): Promise<TemplateResponse[]> {
  try {
    const response = await fetch(`${API_URL}/templates`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to fetch templates:', error);
    throw error;
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string): Promise<TemplateResponse> {
  try {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to fetch template:', error);
    throw error;
  }
}

/**
 * Get the default system template
 * Requirements: 1.2, 17.3
 */
export async function getDefaultTemplate(): Promise<TemplateResponse | null> {
  try {
    const response = await fetch(`${API_URL}/templates/default`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      handleApiError(error);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to fetch default template:', error);
    return null;
  }
}

/**
 * Create a new template
 */
export async function createTemplate(data: CreateTemplateDto): Promise<TemplateResponse> {
  try {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to create template:', error);
    throw error;
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: string, data: UpdateTemplateDto): Promise<TemplateResponse> {
  try {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to update template:', error);
    throw error;
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }
  } catch (error: any) {
    console.error('Failed to delete template:', error);
    throw error;
  }
}

/**
 * Extract metadata from an uploaded header document using AI
 */
export async function extractMetadata(file: File): Promise<ExtractedMetadata> {
  try {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/templates/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to extract metadata:', error);
    throw error;
  }
}

/**
 * Apply a template to exam data and generate PDF
 */
export async function applyTemplate(templateId: string, examData: ExamData): Promise<Blob> {
  try {
    const response = await fetch(`${API_URL}/templates/${templateId}/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(examData),
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError(error);
    }

    return await response.blob();
  } catch (error: any) {
    console.error('Failed to apply template:', error);
    throw error;
  }
}

/**
 * Check if user has reached their template limit
 */
export async function checkTemplateLimit(): Promise<{ count: number; limit: number; canCreate: boolean }> {
  try {
    const templates = await getTemplates();
    const count = templates.length;
    const limit = 10; // Premium limit
    
    return {
      count,
      limit,
      canCreate: count < limit,
    };
  } catch (error: any) {
    console.error('Failed to check template limit:', error);
    throw error;
  }
}

/**
 * Download a generated PDF
 */
export function downloadPdf(blob: Blob, filename: string = 'exam.pdf'): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
