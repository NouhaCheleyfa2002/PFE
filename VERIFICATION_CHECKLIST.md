# Document Processing Pipeline - Verification Checklist

Use this checklist to verify that your document processing pipeline is working correctly.

## ✅ Pre-Flight Checks

### Infrastructure
- [ ] Docker is installed and running
- [ ] Docker Compose is installed
- [ ] Node.js 18+ is installed
- [ ] npm is installed

### Services Running
```bash
docker-compose ps
```
- [ ] seaweed-master (port 9333) - Status: Up
- [ ] seaweed-volume (port 8080) - Status: Up
- [ ] seaweed-filer (port 8888) - Status: Up
- [ ] redis (port 6379) - Status: Up

### SeaweedFS Accessible
```bash
curl http://localhost:8888
```
- [ ] Returns HTML page (SeaweedFS Filer UI)

## ✅ Backend Checks

### Installation
```bash
cd backend
npm install
```
- [ ] No errors during installation
- [ ] `node_modules` folder created

### Configuration
Check `backend/.env`:
- [ ] `REDIS_HOST=localhost`
- [ ] `REDIS_PORT=6379`
- [ ] `SEAWEED_MASTER_URL=http://localhost:9333`
- [ ] `SEAWEED_FILER_URL=http://localhost:8888`
- [ ] `ADMIN_EMAIL` is set
- [ ] `ADMIN_PASSWORD` is set

Optional (for real OCR):
- [ ] `AZURE_OCR_ENDPOINT` is set
- [ ] `AZURE_OCR_API_KEY` is set

### Backend Startup
```bash
npm run start:dev
```

Look for these log messages:
- [ ] `[NestApplication] Nest application successfully started`
- [ ] `[AuthService] Admin account created` or `Admin account already exists`
- [ ] `[DocumentProcessorService] Document Processor Worker starting...`
- [ ] `[DocumentProcessorService] Worker started, polling every 5000ms`
- [ ] No error messages in red

### Backend API Accessible
```bash
curl http://localhost:3000
```
- [ ] Returns `{"message":"Hello World!"}`

## ✅ Frontend Checks

### Installation
```bash
cd front
npm install
```
- [ ] No errors during installation
- [ ] `node_modules` folder created

### Frontend Startup
```bash
npm run dev
```
- [ ] `ready - started server on 0.0.0.0:3001`
- [ ] No compilation errors

### Frontend Accessible
Open browser: http://localhost:3001
- [ ] Page loads without errors
- [ ] Redirects to `/auth` page
- [ ] Login form is visible

## ✅ Authentication Checks

### Login Test
1. Navigate to http://localhost:3001/auth
2. Enter credentials:
   - Email: `admin@example.com` (from .env)
   - Password: `SuperSecret123` (from .env)
3. Click Login

- [ ] Login successful
- [ ] Redirected to `/dashboard`
- [ ] No error messages

### JWT Token
Open browser DevTools → Application → Local Storage
- [ ] `auth_token` exists
- [ ] `auth_user` exists with user data

## ✅ Document Upload Checks

### Navigate to Documents Page
Go to: http://localhost:3001/dashboard/documents

- [ ] Page loads without errors
- [ ] Upload interface is visible
- [ ] "My Documents" section is visible

### Upload a PDF

1. Click upload area or drag a PDF file
2. Select a PDF file (any PDF, max 100MB)
3. Click "Upload Documents"

- [ ] File appears in "Selected Files" list
- [ ] Upload button is enabled
- [ ] Upload starts (shows "Uploading...")
- [ ] Success message appears
- [ ] Document appears in "My Documents" list
- [ ] Initial status is "PENDING" (yellow badge)

### Check Backend Logs

After upload, check backend terminal:
- [ ] `[DocumentsService] Document created: [uuid] - [filename].pdf`
- [ ] No error messages

## ✅ Worker Processing Checks

### Wait for Processing
Wait 5-15 seconds and watch the document status:

- [ ] Status changes from "PENDING" to "PROCESSING" (blue badge with spinner)
- [ ] Status changes from "PROCESSING" to "COMPLETED" (green badge with checkmark)

If status becomes "FAILED" (red badge):
- [ ] Check backend logs for error message
- [ ] Check `errorMessage` field in document list

### Check Backend Logs

During processing, you should see:
- [ ] `[DocumentProcessorService] Processing document: [uuid] - [filename].pdf`
- [ ] `[OCRService] Starting OCR processing for document: [uuid]`
- [ ] `[OCRService] Using mock OCR` (if Azure not configured)
- [ ] `[OCRService] Document submitted to Azure OCR` (if Azure configured)
- [ ] `[OCRService] OCR status: succeeded`
- [ ] `[DocumentsService] Document [uuid] OCR result saved`
- [ ] `[DocumentProcessorService] Document [uuid] processed successfully`

## ✅ OCR Result Checks

### View OCR Result (UI)
Once document status is "COMPLETED":

1. Click "View OCR" button
2. New tab opens with JSON file

- [ ] JSON file loads successfully
- [ ] Contains `documentId` field
- [ ] Contains `pages` array
- [ ] Each page has `page`, `text`, and `confidence` fields
- [ ] Contains `totalPages` field
- [ ] Contains `processedAt` timestamp

### View OCR Result (API)
```bash
# Get your document ID from the UI or API
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get OCR result
curl http://localhost:3000/documents/DOCUMENT_ID/ocr-result \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] Returns OCR result URL
- [ ] Status is "completed"

### Check SeaweedFS
Open http://localhost:8888 in browser:

1. Navigate to `/uploads/` folder
2. Navigate to current year/month/day folder

- [ ] Original PDF file is present
- [ ] OCR result JSON file is present (ends with `_ocr_result.json`)
- [ ] Can download both files

## ✅ API Endpoint Checks

### Get My Documents
```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns list of documents
- [ ] Contains `total` count
- [ ] Contains `documents` array

### Get Document by ID
```bash
curl http://localhost:3000/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns document details
- [ ] Contains all fields (id, originalName, status, etc.)

### Get Statistics
```bash
curl http://localhost:3000/documents/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns statistics object
- [ ] Contains counts: total, pending, processing, completed, failed

### Get Processing Status
```bash
curl http://localhost:3000/documents/processing-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns processing status
- [ ] Contains `isProcessing` boolean
- [ ] Contains `stats` object

## ✅ Multi-File Upload Checks

### Upload Multiple PDFs
1. Select 2-3 PDF files at once
2. Click "Upload Documents"

- [ ] All files appear in "Selected Files" list
- [ ] Upload succeeds for all files
- [ ] All documents appear in "My Documents" list
- [ ] All documents are processed in order (FIFO)

### Verify FIFO Order
Check backend logs:
- [ ] Documents are processed in upload order
- [ ] First uploaded = first processed
- [ ] Second uploaded = second processed

## ✅ Error Handling Checks

### Invalid File Type
Try uploading a non-PDF file (e.g., .txt, .jpg):
- [ ] Error message appears: "Only PDF files are allowed"
- [ ] Upload is prevented

### File Too Large
Try uploading a file > 100MB:
- [ ] Error message appears: "File too large"
- [ ] Upload is prevented

### Unauthorized Access
Try accessing API without token:
```bash
curl http://localhost:3000/documents
```
- [ ] Returns 401 Unauthorized error

## ✅ Real-Time Updates Check

### Auto-Refresh
1. Upload a document
2. Don't click anything
3. Watch the status

- [ ] Status updates automatically every 5 seconds
- [ ] No need to manually refresh
- [ ] Status changes are visible in real-time

## ✅ Azure OCR Checks (Optional)

If you configured Azure OCR:

### Configuration
- [ ] `AZURE_OCR_ENDPOINT` is set in `.env`
- [ ] `AZURE_OCR_API_KEY` is set in `.env`
- [ ] Endpoint URL is correct (ends with `.cognitiveservices.azure.com`)

### Processing
Upload a document and check logs:
- [ ] `[OCRService] Document submitted to Azure OCR`
- [ ] `[OCRService] OCR status: running`
- [ ] `[OCRService] OCR status: succeeded`
- [ ] No Azure API errors

### OCR Quality
Check OCR result JSON:
- [ ] Text is accurately extracted
- [ ] Confidence scores are reasonable (> 0.8)
- [ ] All pages are processed

## ✅ Performance Checks

### Upload Speed
- [ ] Upload completes in < 5 seconds for small PDFs (< 10MB)
- [ ] Upload completes in < 30 seconds for large PDFs (< 100MB)

### Processing Speed
- [ ] Mock OCR completes in ~3-5 seconds
- [ ] Azure OCR completes in ~10-30 seconds (depends on document size)

### Worker Responsiveness
- [ ] Worker picks up pending documents within 5 seconds
- [ ] No delays between document processing

## ✅ Cleanup Checks

### Stop Services
```bash
# Stop backend (Ctrl+C)
# Stop frontend (Ctrl+C)
docker-compose down
```

- [ ] Backend stops gracefully
- [ ] Frontend stops gracefully
- [ ] Docker containers stop
- [ ] No error messages

### Restart Services
```bash
docker-compose up -d
cd backend && npm run start:dev
cd front && npm run dev
```

- [ ] All services restart successfully
- [ ] Previously uploaded documents are still visible
- [ ] Worker resumes processing pending documents

## 📊 Success Criteria

### Minimum Requirements
- ✅ Can upload PDF files
- ✅ Files are stored in SeaweedFS
- ✅ Metadata is saved to database
- ✅ Worker processes documents automatically
- ✅ OCR results are generated
- ✅ OCR results are saved as JSON
- ✅ Can view OCR results

### Full Functionality
- ✅ Multi-file upload works
- ✅ FIFO queue is respected
- ✅ Real-time status updates work
- ✅ Error handling works
- ✅ Authentication works
- ✅ All API endpoints work
- ✅ UI is responsive and functional

## 🐛 Troubleshooting

If any check fails, see:
- `DOCUMENT_PROCESSING_PIPELINE.md` - Full documentation
- `backend/SETUP_DOCUMENT_PIPELINE.md` - Setup guide
- Backend logs for error messages
- Browser console for frontend errors

## 📝 Notes

- Mock OCR is used by default (no Azure credentials needed)
- Worker polls every 5 seconds (configurable)
- Maximum file size: 100MB per PDF
- Maximum files per upload: 10
- Supported file types: PDF only

## ✅ Final Verification

If all checks pass:
- ✅ Your document processing pipeline is fully functional!
- ✅ Ready for production use (after database migration)
- ✅ Ready for Azure OCR integration
- ✅ Ready for advanced features

Congratulations! 🎉
