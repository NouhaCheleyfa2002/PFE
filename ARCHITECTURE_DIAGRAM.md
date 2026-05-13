# Document Processing Pipeline - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  DocumentUpload Component                                     │ │
│  │  - Multi-file PDF upload                                      │ │
│  │  - Real-time status tracking                                  │ │
│  │  - Auto-refresh every 5s                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP POST /documents/upload
                                  │ (multipart/form-data)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (NestJS)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  DocumentsController                                          │ │
│  │  - Validates PDF files                                        │ │
│  │  - JWT authentication                                         │ │
│  │  - Multi-file handling                                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                  │                                  │
│                                  ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  UploadService                                                │ │
│  │  - Uploads PDF to SeaweedFS                                   │ │
│  │  - Returns storage URL                                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                  │                                  │
│                                  ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  DocumentsService                                             │ │
│  │  - Creates document record                                    │ │
│  │  - Status: PENDING                                            │ │
│  │  - Saves metadata (not PDF!)                                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Document saved to DB
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE (In-Memory / PostgreSQL)                │
│                                                                     │
│  documents table:                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ id: uuid                                                    │   │
│  │ user_id: uuid                                               │   │
│  │ original_name: "exam.pdf"                                   │   │
│  │ storage_url: "http://seaweedfs:8888/uploads/..."           │   │
│  │ status: "pending" ← FIFO Queue                              │   │
│  │ created_at: timestamp ← Sort by this                        │   │
│  │ ocr_result_url: null (filled later)                         │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Worker polls every 5s
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKER SERVICE (Background)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  DocumentProcessorService                                     │ │
│  │                                                               │ │
│  │  Every 5 seconds:                                             │ │
│  │  1. SELECT * FROM documents                                   │ │
│  │     WHERE status = 'pending'                                  │ │
│  │     ORDER BY created_at ASC                                   │ │
│  │     LIMIT 1                                                   │ │
│  │                                                               │ │
│  │  2. Mark as 'processing'                                      │ │
│  │                                                               │ │
│  │  3. Send to OCR Service                                       │ │
│  │                                                               │ │
│  │  4. Save OCR result                                           │ │
│  │                                                               │ │
│  │  5. Mark as 'completed' or 'failed'                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ PDF URL
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AZURE OCR SERVICE (or Mock)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  OCRService                                                   │ │
│  │                                                               │ │
│  │  If Azure configured:                                         │ │
│  │  1. POST to Azure Document Intelligence                      │ │
│  │  2. Poll for results (every 2s, max 30 attempts)             │ │
│  │  3. Extract text from all pages                              │ │
│  │                                                               │ │
│  │  If Azure NOT configured:                                     │ │
│  │  1. Use mock OCR (3s delay)                                  │ │
│  │  2. Return sample text                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ OCR Result (JSON)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SEAWEEDFS (File Storage)                         │
│                                                                     │
│  /uploads/2026/05/12/                                               │
│  ├── 1715515200000_exam.pdf          ← Original PDF                │
│  └── 1715515300000_abc123_ocr.json   ← OCR Result                  │
│                                                                     │
│  OCR Result JSON:                                                   │
│  {                                                                  │
│    "documentId": "abc123",                                          │
│    "pages": [                                                       │
│      {                                                              │
│        "page": 1,                                                   │
│        "text": "Extracted text from page 1...",                     │
│        "confidence": 0.95                                           │
│      }                                                              │
│    ],                                                               │
│    "totalPages": 2,                                                 │
│    "processedAt": "2026-05-12T10:05:00Z"                            │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Update document record
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE (Updated)                               │
│                                                                     │
│  documents table:                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ id: uuid                                                    │   │
│  │ status: "completed" ✅                                      │   │
│  │ ocr_result_url: "http://seaweedfs:8888/.../ocr.json"       │   │
│  │ processed_at: timestamp                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ User requests OCR result
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Updated)                          │
│                                                                     │
│  Document Status: ✅ COMPLETED                                      │
│  [View OCR] button → Opens OCR JSON result                          │
└─────────────────────────────────────────────────────────────────────┘
```

## FIFO Queue Visualization

```
Upload Order:        Processing Order:
┌─────────┐         ┌─────────┐
│ PDF #1  │ ──────► │ PDF #1  │ ← Processed FIRST
└─────────┘         └─────────┘
     ↓                   ↓
┌─────────┐         ┌─────────┐
│ PDF #2  │ ──────► │ PDF #2  │ ← Processed SECOND
└─────────┘         └─────────┘
     ↓                   ↓
┌─────────┐         ┌─────────┐
│ PDF #3  │ ──────► │ PDF #3  │ ← Processed THIRD
└─────────┘         └─────────┘

Implementation:
SELECT * FROM documents 
WHERE status = 'pending' 
ORDER BY created_at ASC  ← Oldest first (FIFO)
LIMIT 1
```

## Document Status Flow

```
┌─────────┐
│ PENDING │ ← Initial status after upload
└─────────┘
     │
     │ Worker picks document
     ▼
┌────────────┐
│ PROCESSING │ ← Worker is processing
└────────────┘
     │
     ├─────────────┬─────────────┐
     │             │             │
     ▼             ▼             ▼
┌───────────┐ ┌─────────┐ ┌─────────┐
│ COMPLETED │ │ FAILED  │ │ TIMEOUT │
└───────────┘ └─────────┘ └─────────┘
     │             │             │
     │             │             │
     ▼             ▼             ▼
  ✅ Success   ❌ Error    ⏱️ Retry
```

## Worker Service Lifecycle

```
Application Start
     │
     ▼
┌─────────────────────────────────────┐
│ DocumentProcessorService.onModuleInit│
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ Start Polling Interval (5s)         │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ Every 5 seconds:                    │
│ 1. Check if already processing      │
│ 2. Get next pending document        │
│ 3. Process document                 │
│ 4. Update status                    │
└─────────────────────────────────────┘
     │
     │ (Runs continuously)
     │
     ▼
┌─────────────────────────────────────┐
│ Application Shutdown                │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ DocumentProcessorService.onModuleDestroy│
│ - Stop polling interval             │
│ - Cleanup resources                 │
└─────────────────────────────────────┘
```

## Data Flow Summary

```
1. USER ACTION
   └─► Upload PDF via UI

2. API LAYER
   └─► Validate file
   └─► Upload to SeaweedFS
   └─► Save metadata to DB (status: pending)

3. QUEUE
   └─► Document added to FIFO queue
   └─► Sorted by created_at timestamp

4. WORKER
   └─► Polls every 5s
   └─► Picks oldest pending document
   └─► Marks as processing

5. OCR
   └─► Sends PDF URL to Azure OCR
   └─► Waits for results
   └─► Extracts text from all pages

6. STORAGE
   └─► Saves OCR result as JSON to SeaweedFS
   └─► Updates document with OCR URL

7. COMPLETION
   └─► Marks document as completed
   └─► User can view OCR result
```

## Technology Stack

```
┌──────────────────────────────────────────┐
│ Frontend                                 │
│ - Next.js 16                             │
│ - React 19                               │
│ - TypeScript                             │
│ - Tailwind CSS                           │
└──────────────────────────────────────────┘
                  │
                  │ REST API
                  ▼
┌──────────────────────────────────────────┐
│ Backend                                  │
│ - NestJS                                 │
│ - TypeScript                             │
│ - JWT Authentication                     │
│ - Multer (file upload)                   │
└──────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│ SeaweedFS    │   │ Database     │
│ - PDF files  │   │ - Metadata   │
│ - OCR JSON   │   │ - Queue      │
└──────────────┘   └──────────────┘
        │
        ▼
┌──────────────────────────────────────────┐
│ Azure AI Document Intelligence           │
│ - OCR Processing                         │
│ - Text Extraction                        │
└──────────────────────────────────────────┘
```

## Key Design Decisions

### ✅ Why SeaweedFS for PDFs?
- Scalable file storage
- Not bloating database
- Easy to backup/replicate
- Direct URL access

### ✅ Why FIFO Queue?
- Fair processing order
- Predictable behavior
- Simple implementation
- Easy to debug

### ✅ Why Background Worker?
- Non-blocking uploads
- Automatic processing
- Retry capability
- Resource management

### ✅ Why JSON for OCR Results?
- Structured data
- Easy to parse
- Searchable
- AI-ready format

### ✅ Why Mock OCR?
- Test without Azure account
- Faster development
- No API costs
- Predictable results
