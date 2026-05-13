# 🚀 Quick Start - Document Processing Pipeline

## 30-Second Setup

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start backend (in new terminal)
cd backend
npm install
npm run start:dev

# 3. Start frontend (in new terminal)
cd front
npm install
npm run dev

# 4. Open browser
# http://localhost:3001/dashboard/documents
```

## Test It

1. **Login**: admin@example.com / SuperSecret123
2. **Upload**: Drop a PDF file
3. **Wait**: ~5-10 seconds
4. **View**: Click "View OCR" button

## What Happens

```
Your PDF → SeaweedFS Storage → Worker Queue (FIFO) → 
Azure OCR (or Mock) → JSON Result → Done! ✅
```

## Key URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **SeaweedFS UI**: http://localhost:8888
- **API Docs**: See `DOCUMENT_PROCESSING_PIPELINE.md`

## Configuration (Optional)

Edit `backend/.env` to add Azure OCR:

```env
AZURE_OCR_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_OCR_API_KEY=your-api-key-here
```

**Without Azure**: Mock OCR is used automatically (perfect for testing!)

## API Quick Test

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SuperSecret123"}'

# Upload (replace YOUR_TOKEN)
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test.pdf"

# Check status
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Worker not processing?
Check backend logs for:
```
[DocumentProcessorService] Worker started, polling every 5000ms
```

### Upload failing?
1. Check Docker: `docker-compose ps`
2. Test SeaweedFS: http://localhost:8888
3. Check backend logs

### Need help?
See detailed docs:
- `DOCUMENT_PROCESSING_PIPELINE.md` - Full documentation
- `backend/SETUP_DOCUMENT_PIPELINE.md` - Setup guide
- `IMPLEMENTATION_SUMMARY.md` - What was built

## Features

✅ Multi-file PDF upload
✅ FIFO queue processing
✅ Real-time status updates
✅ Azure OCR integration
✅ Mock OCR for testing
✅ Automatic worker service
✅ JSON results in SeaweedFS
✅ Complete REST API

## That's It!

You now have a fully functional document processing pipeline. Upload PDFs and watch them get processed automatically! 🎉

For production deployment, see `DOCUMENT_PROCESSING_PIPELINE.md` for database migration and advanced configuration.
