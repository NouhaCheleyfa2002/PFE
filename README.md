"# PFE - EduShare Platform

## 🎓 About

EduShare is a collaborative educational platform for Tunisian universities that enables:
- Role-based access (Admin, Teacher, Student)
- Document processing with OCR
- Exam building and question management
- Resource sharing across institutions

## 🚀 New Feature: Document Processing Pipeline

A complete **PDF document processing pipeline** with automatic OCR has been implemented!

### Features
✅ Multi-file PDF upload
✅ Automatic OCR processing (Azure AI Document Intelligence)
✅ FIFO queue processing
✅ Real-time status updates
✅ JSON results storage
✅ Complete REST API

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

### Documentation
- **[📖 Quick Start Guide](QUICK_START.md)** - Get started in 30 seconds
- **[📋 Complete Documentation](DOCUMENT_PROCESSING_PIPELINE.md)** - Full technical docs
- **[🏗️ Architecture Diagrams](ARCHITECTURE_DIAGRAM.md)** - Visual flow diagrams
- **[✅ Verification Checklist](VERIFICATION_CHECKLIST.md)** - Testing guide
- **[📝 Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - What was built

## 📁 Project Structure

```
├── backend/              # NestJS API
│   ├── src/
│   │   ├── auth/        # Authentication & JWT
│   │   ├── documents/   # 📄 Document processing pipeline (NEW!)
│   │   ├── upload/      # File upload to SeaweedFS
│   │   ├── questions/   # Question bank
│   │   ├── admin/       # Admin endpoints
│   │   └── notification/ # Background jobs
│   └── .env             # Configuration
│
├── front/               # Next.js Frontend
│   ├── app/
│   │   ├── auth/        # Login/Register
│   │   ├── dashboard/   # Main dashboard
│   │   │   └── documents/ # 📄 Document upload UI (NEW!)
│   │   └── student/     # Student views
│   └── components/      # Reusable components
│
├── docker-compose.yml   # Infrastructure (SeaweedFS, Redis)
└── README.md           # This file
```

## 🛠️ Technology Stack

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type-safe development
- **JWT** - Authentication
- **BullMQ** - Job queue
- **SeaweedFS** - Distributed file storage
- **Azure AI** - Document Intelligence (OCR)

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Infrastructure
- **Docker** - Containerization
- **Redis** - Message queue
- **SeaweedFS** - Object storage

## 🔧 Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

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
- Email: `admin@example.com`
- Password: `SuperSecret123`

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

## 🐛 Troubleshooting

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

### Worker not processing documents
Check backend logs for:
```
[DocumentProcessorService] Worker started, polling every 5000ms
```

### More Help
See [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) for detailed troubleshooting.

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

## 🚀 Deployment

### Production Checklist
- [ ] Migrate to PostgreSQL database
- [ ] Configure Azure OCR credentials
- [ ] Set up environment variables
- [ ] Configure CORS for production domain
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging
- [ ] Scale worker instances

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Next.js team for the React framework
- Azure AI for Document Intelligence
- SeaweedFS for distributed storage

---

**For detailed documentation on the document processing pipeline, see [README_DOCUMENT_PIPELINE.md](README_DOCUMENT_PIPELINE.md)**" 
