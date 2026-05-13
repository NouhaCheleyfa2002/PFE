# Document Processing Pipeline

## Overview

This document processing pipeline enables automated OCR (Optical Character Recognition) processing of PDF documents using Azure AI Document Intelligence. The system follows a FIFO (First In, First Out) queue architecture.

## Architecture

```
Frontend (Next.js)
    ↓
Backend API (NestJS)
    ↓
SeaweedFS ← PDF Storage
    ↓
PostgreSQL/MySQL ← Metadata + Queue (currently in-memory)
    ↓
Worker Service (Background Processor)
    ↓
Azure OCR (Document Intelligence)
    ↓
JSON Result
    ↓
SeaweedFS ← OCR Results Storage
```

## Components

### 1. Frontend (`front/components/documents/DocumentUpload.tsx`)
- Multi-file PDF upload interface
- Real-time document status tracking
- Auto-refresh every 5 seconds
- View OCR results

### 2. Backend API (`backend/src/documents/`)

#### Files Created:
- `document.interface.ts` - TypeScript interfaces and enums
- `documents.service.ts` - Document metadata management
- `ocr.service.ts` - Azure OCR integration
- `document-processor.service.ts` - Background worker service
- `documents.controller.ts` - REST API endpoints
- `documents.module.ts` - NestJS module configuration

### 3. Document Status Flow

```
PENDING → PROCESSING → COMPLETED
                    ↓
                  FAILED
```

## API Endpoints

### Upload Documents
```http
POST /documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body: files[] (multiple PDF files)
```

**Response:**
```json
{
  "message": "Successfully uploaded 2 document(s)",
  "documents": [
    {
      "id": "uuid",
      "originalName": "exam.pdf",
      "status": "pending",
      "createdAt": "2026-05-12T10:00:00Z"
    }
  ]
}
```

### Get My Documents
```http
GET /documents
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 5,
  "documents": [
    {
      "id": "uuid",
      "originalName": "exam.pdf",
      "status": "completed",
      "fileSize": 1048576,
      "createdAt": "2026-05-12T10:00:00Z",
      "processedAt": "2026-05-12T10:05:00Z",
      "ocrResultUrl": "http://localhost:8888/uploads/2026/05/12/uuid_ocr_result.json"
    }
  ]
}
```

### Get Document by ID
```http
GET /documents/:id
Authorization: Bearer <token>
```

### Get OCR Result
```http
GET /documents/:id/ocr-result
Authorization: Bearer <token>
```

### Get Statistics
```http
GET /documents/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 10,
  "pending": 2,
  "processing": 1,
  "completed": 6,
  "failed": 1
}
```

### Get Processing Status
```http
GET /documents/processing-status
Authorization: Bearer <token>
```

## Worker Service

The `DocumentProcessorService` runs as a background service that:

1. **Polls every 5 seconds** (configurable via `DOCUMENT_POLL_INTERVAL_MS`)
2. **Fetches next pending document** (FIFO order by `createdAt`)
3. **Marks as processing**
4. **Sends to Azure OCR**
5. **Saves OCR result as JSON to SeaweedFS**
6. **Updates document status**

### Worker Lifecycle
- Starts automatically when the NestJS application starts (`OnModuleInit`)
- Stops gracefully when the application shuts down (`OnModuleDestroy`)
- Prevents concurrent processing with `isProcessing` flag

## Azure OCR Integration

### Configuration

Add to `backend/.env`:
```env
AZURE_OCR_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com
AZURE_OCR_API_KEY=your-api-key-here
```

### Getting Azure Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a **Document Intelligence** resource
3. Copy the **Endpoint** and **API Key**

### OCR Process

1. **Submit document** to Azure for analysis
2. **Poll for results** (checks every 2 seconds, max 30 attempts)
3. **Extract text** from all pages
4. **Format as JSON**:

```json
{
  "documentId": "uuid",
  "pages": [
    {
      "page": 1,
      "text": "Extracted text from page 1...",
      "confidence": 0.95
    },
    {
      "page": 2,
      "text": "Extracted text from page 2...",
      "confidence": 0.93
    }
  ],
  "totalPages": 2,
  "processedAt": "2026-05-12T10:05:00Z"
}
```

### Mock OCR (for testing without Azure)

If Azure credentials are not configured, the system automatically uses mock OCR that:
- Simulates 3-second processing time
- Returns sample text for 2 pages
- Useful for development and testing

## Database Schema (In-Memory)

Currently using in-memory storage. For production, migrate to PostgreSQL/MySQL:

```sql
CREATE TABLE documents (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_url VARCHAR(500) NOT NULL,
  ocr_result_url VARCHAR(500),
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  error_message TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_status_created (status, created_at)
);
```

## File Storage

### PDFs
- Stored in SeaweedFS at: `/uploads/YYYY/MM/DD/timestamp_filename.pdf`
- Example: `/uploads/2026/05/12/1715515200000_exam.pdf`

### OCR Results
- Stored in SeaweedFS as JSON files
- Naming: `{documentId}_ocr_result.json`
- Example: `/uploads/2026/05/12/1715515300000_abc123_ocr_result.json`

## Configuration

### Environment Variables

```env
# SeaweedFS
SEAWEED_MASTER_URL=http://localhost:9333
SEAWEED_FILER_URL=http://localhost:8888

# Azure OCR
AZURE_OCR_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com
AZURE_OCR_API_KEY=your-api-key-here

# Worker Configuration
DOCUMENT_POLL_INTERVAL_MS=5000
```

### File Limits

- **Max file size**: 100MB per PDF
- **Max files per upload**: 10 files
- **Allowed types**: PDF only (`application/pdf`)

## Running the System

### 1. Start Infrastructure
```bash
docker-compose up -d
```

This starts:
- SeaweedFS (Master, Volume, Filer)
- Redis

### 2. Start Backend
```bash
cd backend
npm install
npm run start:dev
```

The worker service starts automatically.

### 3. Start Frontend
```bash
cd front
npm install
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- SeaweedFS Filer UI: http://localhost:8888

## Testing

### 1. Upload a PDF
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@test.pdf"
```

### 2. Check Status
```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. View OCR Result
```bash
curl http://localhost:3000/documents/{id}/ocr-result \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring

### Backend Logs

The worker service logs:
- Document processing start/completion
- OCR status updates
- Errors and failures

Example logs:
```
[DocumentProcessorService] Worker started, polling every 5000ms
[DocumentsService] Document created: abc123 - exam.pdf
[DocumentProcessorService] Processing document: abc123 - exam.pdf
[OCRService] Starting OCR processing for document: abc123
[OCRService] Document submitted to Azure OCR, operation: https://...
[OCRService] OCR status: running (attempt 1/30)
[OCRService] OCR status: succeeded (attempt 3/30)
[DocumentsService] Document abc123 OCR result saved: http://...
[DocumentProcessorService] Document abc123 processed successfully
```

## Error Handling

### Upload Errors
- Invalid file type → 400 Bad Request
- File too large → 400 Bad Request
- SeaweedFS upload failure → 500 Internal Server Error

### Processing Errors
- Azure OCR API error → Document marked as `failed`
- Timeout (60 seconds) → Document marked as `failed`
- Network errors → Document marked as `failed`

Failed documents include `errorMessage` field with details.

## Future Enhancements

1. **Database Integration**
   - Replace in-memory storage with PostgreSQL/MySQL
   - Add proper indexing for performance

2. **Advanced Features**
   - Retry failed documents
   - Priority queue (not just FIFO)
   - Batch processing
   - Webhook notifications

3. **AI Integration**
   - Semantic search on OCR results
   - Question generation from documents
   - Document summarization
   - Content chunking for RAG

4. **UI Improvements**
   - Progress bars for processing
   - OCR result viewer
   - Document preview
   - Bulk operations

## Troubleshooting

### Worker not processing documents

Check:
1. Backend is running
2. Worker logs show polling activity
3. Documents are in `pending` status
4. No errors in logs

### Azure OCR failing

Check:
1. `AZURE_OCR_ENDPOINT` is correct
2. `AZURE_OCR_API_KEY` is valid
3. Azure resource has available quota
4. Network connectivity to Azure

### SeaweedFS upload failing

Check:
1. Docker containers are running: `docker-compose ps`
2. SeaweedFS Filer is accessible: http://localhost:8888
3. Ports are not blocked by firewall

## Support

For issues or questions:
1. Check backend logs
2. Check SeaweedFS Filer UI
3. Verify environment variables
4. Test with mock OCR first (remove Azure credentials)
