#!/bin/bash

# Document Processing Pipeline Test Script
# This script tests the complete document processing pipeline

set -e

API_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="SuperSecret123"

echo "========================================="
echo "Document Processing Pipeline Test"
echo "========================================="
echo ""

# Step 1: Login
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Create a test PDF
echo "Step 2: Creating test PDF..."
TEST_PDF="test-document.pdf"

# Create a simple PDF using echo and convert (if available)
# For testing, we'll create a dummy file
echo "%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF" > $TEST_PDF

echo "✅ Test PDF created: $TEST_PDF"
echo ""

# Step 3: Upload document
echo "Step 3: Uploading document..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@$TEST_PDF")

DOCUMENT_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$DOCUMENT_ID" ]; then
  echo "❌ Upload failed!"
  echo "Response: $UPLOAD_RESPONSE"
  rm -f $TEST_PDF
  exit 1
fi

echo "✅ Document uploaded successfully!"
echo "Document ID: $DOCUMENT_ID"
echo ""

# Step 4: Check initial status
echo "Step 4: Checking initial status..."
sleep 1
STATUS_RESPONSE=$(curl -s "$API_URL/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN")

INITIAL_STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "Initial status: $INITIAL_STATUS"
echo ""

# Step 5: Wait for processing
echo "Step 5: Waiting for document processing..."
echo "This may take 10-15 seconds..."

MAX_ATTEMPTS=20
ATTEMPT=0
CURRENT_STATUS="pending"

while [ "$CURRENT_STATUS" != "completed" ] && [ "$CURRENT_STATUS" != "failed" ] && [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
  
  STATUS_RESPONSE=$(curl -s "$API_URL/documents/$DOCUMENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  CURRENT_STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS - Status: $CURRENT_STATUS"
done

echo ""

# Step 6: Check final status
if [ "$CURRENT_STATUS" = "completed" ]; then
  echo "✅ Document processing completed successfully!"
  echo ""
  
  # Step 7: Get OCR result
  echo "Step 6: Retrieving OCR result..."
  OCR_RESPONSE=$(curl -s "$API_URL/documents/$DOCUMENT_ID/ocr-result" \
    -H "Authorization: Bearer $TOKEN")
  
  OCR_URL=$(echo $OCR_RESPONSE | grep -o '"ocrResultUrl":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$OCR_URL" ]; then
    echo "✅ OCR result available!"
    echo "OCR Result URL: $OCR_URL"
    echo ""
    
    # Fetch and display OCR result
    echo "OCR Result Preview:"
    echo "-------------------"
    curl -s "$OCR_URL" | head -20
    echo ""
    echo "-------------------"
  else
    echo "⚠️  OCR result URL not found"
  fi
  
elif [ "$CURRENT_STATUS" = "failed" ]; then
  echo "❌ Document processing failed!"
  ERROR_MSG=$(echo $STATUS_RESPONSE | grep -o '"errorMessage":"[^"]*' | cut -d'"' -f4)
  echo "Error: $ERROR_MSG"
else
  echo "⚠️  Processing timeout - status still: $CURRENT_STATUS"
fi

echo ""

# Step 8: Get statistics
echo "Step 7: Getting document statistics..."
STATS_RESPONSE=$(curl -s "$API_URL/documents/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "Statistics:"
echo "$STATS_RESPONSE" | grep -o '"[^"]*":[0-9]*' | sed 's/"//g' | sed 's/:/: /'
echo ""

# Cleanup
echo "Cleaning up test file..."
rm -f $TEST_PDF

echo ""
echo "========================================="
echo "Test Complete!"
echo "========================================="

if [ "$CURRENT_STATUS" = "completed" ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "⚠️  Some tests did not complete as expected"
  exit 1
fi
