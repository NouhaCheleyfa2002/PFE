"# PFE - EduShare Platform

## 🎓 About

EduShare is a collaborative educational platform for Tunisian universities that enables:
- Role-based access (Admin, Teacher, Student)
- Document processing with OCR
- Exam building and question management
- Resource sharing across institutions

## 🚀 New Features

### 1. Document Processing Pipeline with OCR

A complete **PDF document processing pipeline** with automatic OCR has been implemented!

**Features:**
✅ Multi-file PDF upload
✅ Automatic OCR processing (Azure AI Document Intelligence)
✅ FIFO queue processing
✅ Real-time status updates
✅ JSON results storage
✅ Complete REST API

### 2. DeepSeek AI Integration

**AI-powered features** integrated into the platform!

**Features:**
✅ Chat with AI assistant
✅ Text summarization
✅ Multi-language translation
✅ Professional email generation
✅ JWT-protected endpoints
✅ Complete error handling

**Quick Start:**
```bash
# Add to backend/.env
DEEPSEEK_API_KEY=your-api-key-here

# Test endpoints
POST /ai/chat
POST /ai/summarize
POST /ai/translate
POST /ai/generate-email
```

📚 **Documentation:** See `backend/AI_QUICK_START.md`

### 3. Exam Processing Pipeline (NEW!)

**Complete end-to-end pipeline** for automatic exam question extraction!

**Pipeline Flow:**
```
PDF Upload → OCR → DeepSeek AI Parsing → Vector Embeddings → pgvector Storage → Semantic Search
```

**Features:**
✅ Automatic question extraction from exam PDFs
✅ AI-powered parsing with DeepSeek
✅ Vector embeddings with BAAI/bge-m3 (local, no API costs)
✅ Semantic search with pgvector
✅ Topic and difficulty classification
✅ Multiple choice question support
✅ Document-to-questions linking
✅ Reprocessing capability

**API Endpoints:**
```bash
GET  /exam-questions              # List all questions
GET  /exam-questions/:id          # Get single question
GET  /exam-questions/document/:id # Questions from specific exam
POST /exam-questions/search       # Semantic search
GET  /exam-questions/meta/topics  # List all topics
GET  /exam-questions/meta/stats   # Statistics
POST /exam-questions/reprocess/:id # Reprocess document
```

**Quick Start:**
```bash
# 1. Start services
docker-compose up -d

# 2. Configure (add to backend/.env)
DEEPSEEK_API_KEY=your-key-here
EMBEDDINGS_SERVER_URL=http://localhost:8000

# 3. Upload exam PDF
POST /documents/upload

# 4. Wait for processing (automatic)

# 5. Search questions
POST /exam-questions/search
{
  "query": "cardiac cycle",
  "limit": 10
}
```

📚 **Documentation:** See `backend/EXAM_PIPELINE_QUICK_START.md`

### Quick Start
```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start backend
cd backend && npm install && npm run start:dev

# 3. Start frontend  
cd front && npm install && npm run dev

# 4. Open browser
http://localhost:3001/dashboard/documents
```

### Infrastructure
- **Docker** - Containerization
- **Redis** - Message queue
- **SeaweedFS** - Object storage
- **PostgreSQL** - Database
- **DeepSeek AI** - AI features


### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd PFE
```

2. **Start infrastructure**
```bash
docker-compose up -d
```

3. **Setup backend**
```bash
cd backend
npm install
cp .env.example .env  # Edit with your credentials
npm run start:dev
```

4. **Setup frontend**
```bash
cd front
npm install
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- SeaweedFS UI: http://localhost:8888

### Default Credentials

**Admin Account:**
- Email: `admin@example.com`
- Password: `SuperSecret123`
- Role: Administrator

**Teacher Account:**
- Email: `teacher@university.tn`
- Password: `Teacher123`
- Role: Teacher (Educator)
- Name: Dr. Sarah Khalil
- University: Faculty of Medicine, Tunis

## 📚 Features

### ✅ Implemented
- **Authentication**: JWT-based with role management
- **Document Processing**: PDF upload with OCR extraction
- **File Storage**: SeaweedFS distributed storage
- **Question Bank**: Multiple question types (MCQ, True/False, Fill-in, etc.)
- **Admin Panel**: User management and worker monitoring
- **Background Jobs**: BullMQ queue processing
- **Real-time Updates**: Auto-refresh document status

### 🔮 Coming Soon
- Database integration (PostgreSQL)
- AI question generation
- Exam builder interface
- Analytics dashboard
- Semantic search

## 🎯 User Roles

### Admin
- Manage users
- View all courses
- Monitor worker tasks
- System settings

### Teacher
- Upload courses
- Build exams
- Manage resources
- View analytics

### Student
- Access library
- View assignments
- Submit work

## 📖 API Documentation

### Authentication
```bash
POST /auth/register  # Register new user
POST /auth/login     # Login
GET  /auth/me        # Get current user
```

### Documents (NEW!)
```bash
POST /documents/upload              # Upload PDFs
GET  /documents                     # Get my documents
GET  /documents/:id                 # Get document details
GET  /documents/:id/ocr-result      # Get OCR result
GET  /documents/stats               # Get statistics
GET  /documents/processing-status   # Get worker status
```

### Questions
```bash
GET /questions           # Get all questions
GET /questions/:id       # Get question by ID
GET /questions/categories # Get categories
```

### Upload
```bash
POST /upload            # Upload file to SeaweedFS
GET  /upload/:fid       # Get file URL
DELETE /upload/:fid     # Delete file
```

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Test Document Pipeline
```bash
cd backend
bash test-document-pipeline.sh
```

### Manual Testing
1. Login at http://localhost:3001/auth
2. Navigate to Documents page
3. Upload a PDF file
4. Watch it process automatically
5. View OCR results

## 📊 Monitoring

### Backend Logs
```bash
cd backend
npm run start:dev
# Watch for worker activity and processing logs
```

### SeaweedFS UI
Open http://localhost:8888 to view stored files

### Document Statistics
```bash
curl http://localhost:3000/documents/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```


### Docker containers not starting
```bash
docker-compose down
docker-compose up -d
docker-compose ps  # Check status
```

### Backend not connecting to SeaweedFS
Check `.env` file:
```env
SEAWEED_MASTER_URL=http://localhost:9333
SEAWEED_FILER_URL=http://localhost:8888
```


## 📝 Development

### Backend Development
```bash
cd backend
npm run start:dev     # Development mode with hot reload
npm run build         # Build for production
npm run start:prod    # Run production build
```

### Frontend Development
```bash
cd front
npm run dev          # Development mode
npm run build        # Build for production
npm run start        # Run production build
```



---

**For detailed documentation on the document processing pipeline, see [README_DOCUMENT_PIPELINE.md](README_DOCUMENT_PIPELINE.md)**" 
