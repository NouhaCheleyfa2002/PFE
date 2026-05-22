// Quick script to check if worker is running and document status
const axios = require('axios');

async function checkWorker() {
  try {
    console.log('Checking backend health...');
    
    // Check if backend is responding
    const healthCheck = await axios.get('http://localhost:3001');
    console.log('✓ Backend is running');
    
    // Try to get documents (you'll need to be authenticated)
    // For now, just check if the endpoint exists
    console.log('\nTo check documents, you need to:');
    console.log('1. Upload a PDF via the frontend at http://localhost:3000/dashboard/upload');
    console.log('2. Watch the backend console logs for OCR processing messages');
    console.log('3. Look for these log messages:');
    console.log('   - [DocumentProcessorService] Processing document: <id>');
    console.log('   - [OCRService] Starting OCR processing for document: <id>');
    console.log('   - [OCRService] Document submitted to Azure OCR (if using real Azure)');
    console.log('   - [OCRService] Using mock OCR (if credentials invalid)');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWorker();
