export interface Document {
  id: string;
  userId: string;
  originalName: string;
  storageUrl: string;
  ocrResultUrl?: string;
  status: DocumentStatus;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
}

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface OCRResult {
  documentId: string;
  pages: OCRPage[];
  totalPages: number;
  processedAt: Date;
}

export interface OCRPage {
  page: number;
  text: string;
  confidence?: number;
}
