const axios = require('axios');

// SVT document ID from the script output
const DOCUMENT_ID = 'e4d96e27-b2fb-470f-9055-f01e56474326';
const API_URL = 'http://localhost:8888/moderation/documents/' + DOCUMENT_ID + '/re-extract-diagrams';

async function triggerReExtraction() {
  try {
    console.log('🚀 Triggering diagram re-extraction for document:', DOCUMENT_ID);
    console.log('📡 Calling:', API_URL);
    console.log('');

    const response = await axios.post(API_URL, {}, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE'
      }
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

triggerReExtraction();
