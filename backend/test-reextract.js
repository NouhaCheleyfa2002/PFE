const http = require('http');

const documentId = 'e4d96e27-b2fb-470f-9055-f01e56474326';

const options = {
  hostname: 'localhost',
  port: 8888,
  path: `/moderation/documents/${documentId}/re-extract-diagrams`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
