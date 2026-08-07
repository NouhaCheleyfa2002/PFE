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
  // Exam metadata (legacy fields)
  title?: string | null;
  level?: string | null;
  subject?: string | null;
  year?: number | null;
  // Enhanced metadata (Phase 2)
  classLevel?: string | null;
  resourceType?: string;
  keywords?: string[] | null;
  description?: string | null;
  license?: string | null;
  price?: number | null;
  isVerified?: boolean;
  bacSection?: string | null; // Tunisian Bac Section (Phase 4)
  // Content Verification (Phase 3)
  verificationStatus?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
  // Stats and ratings
  views?: number;
  downloads?: number;
  averageRating?: number;
  totalRatings?: number;
  bookmarkCount?: number;
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
  figures?: OCRFigure[];
}

export interface OCRFigure {
  id: string;
  caption?: string | null;
  boundingBox: number[]; // Polygon coordinates
  pageNumber: number;
  confidence?: number;
}
