# Quick Setup Guide - Document Processing Pipeline

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- Azure Account (optional, for real OCR)

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Environment

Edit `backend/.env`:

```env
# Required - Already configured
REDIS_HOST=localhost
REDIS_PORT=6379
SEAWEED_MASTER_URL=http://localhost:9333
SEAWEED_FILER_URL=http://localhost:8888

# Optional - For real Azure OCR (otherwise uses mock)
AZURE_OCR_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com
AZURE_OCR_API_KEY=your-api-key-here

# Optional - Worker polling interval (default: 5000ms)
DOCUMENT_POLL_INTERVAL_MS=5000
```

## Step 3: Start Infrastructure

From the project root:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

You should see:
- seaweed-master (port 9333)
- seaweed-volume (port 8080)
- seaweed-filer (port 8888)
- redis (port 6379)

## Step 4: Start Backend

```bash
cd backend
npm run start:dev
```

You should see:
```
[DocumentProcessorService] Document Processor Worker starting...
[DocumentProcessorService] Worker started, polling every 5000ms
```

## Step 5: Test the Pipeline

### Option A: Using the Frontend

1. Start frontend:
```bash
cd front
npm install
npm run dev
```

2. Open http://localhost:3001
3. Login with admin credentials (from .env)
4. Navigate to `/dashboard/documents`
5. Upload a PDF file
6. Watch the status change: pending → processing → completed

### Option B: Using cURL

1. Login to get JWT token:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SuperSecret123"
  }'
```

Save the `access_token` from the response.

2. Upload a PDF:
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "files=@/path/to/your/file.pdf"
```

3. Check document status:
```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

4. Wait ~5-10 seconds and check again. Status should change to `completed`.

5. Get OCR result:
```bash
curl http://localhost:3000/documents/DOCUMENT_ID/ocr-result \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

6. View the OCR JSON file:
```bash
curl http://localhost:8888/uploads/2026/05/12/TIMESTAMP_DOCUMENT_ID_ocr_result.json
```

## Verification Checklist

✅ Docker containers running
✅ Backend started without errors
✅ Worker service polling logs visible
✅ Can upload PDF via API
✅ Document status changes from pending → processing → completed
✅ OCR result JSON file created in SeaweedFS
✅ Can retrieve OCR result via API

## Common Issues

### Issue: Worker not processing

**Solution:** Check backend logs for errors. Ensure worker started:
```
[DocumentProcessorService] Worker started, polling every 5000ms
```

### Issue: Upload fails with "File upload failed"

**Solution:** 
1. Check SeaweedFS is running: `docker-compose ps`
2. Test SeaweedFS: http://localhost:8888
3. Check backend logs for detailed error

### Issue: OCR processing stuck in "processing"

**Solution:**
1. If using Azure OCR, verify credentials are correct
2. Check backend logs for Azure API errors
3. Try without Azure credentials to use mock OCR

### Issue: "Document not found" error

**Solution:** Ensure you're using the correct JWT token and document ID belongs to your user.

## Next Steps

1. **Add Database**: Replace in-memory storage with PostgreSQL
2. **Configure Azure OCR**: Get real OCR results from Azure
3. **Build UI**: Create document viewer and OCR result display
4. **Add Features**: Implement search, filtering, and bulk operations

## Architecture Overview

```
User uploads PDF
    ↓
API saves to SeaweedFS
    ↓
API creates document record (status: pending)
    ↓
Worker polls for pending documents (every 5s)
    ↓
Worker picks first pending document (FIFO)
    ↓
Worker marks as processing
    ↓
Worker sends to Azure OCR (or mock)
    ↓
Worker saves OCR result JSON to SeaweedFS
    ↓
Worker marks as completed
    ↓
User can view OCR result
```

## Monitoring

Watch backend logs in real-time:
```bash
cd backend
npm run start:dev
```

View SeaweedFS files:
- Open http://localhost:8888 in browser
- Navigate to `/uploads/` folder

Check document statistics:
```bash
curl http://localhost:3000/documents/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Check worker status:
```bash
curl http://localhost:3000/documents/processing-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

See `DOCUMENT_PROCESSING_PIPELINE.md` for detailed documentation.
