// Paste this entire script into browser console on exam builder page
// It will diagnose WebSocket connection issues

console.log('🔍 WebSocket Diagnostic Tool\n' + '='.repeat(50));

// 1. Check Token
console.log('\n📋 Step 1: Checking Auth Token...');
const token = localStorage.getItem('auth_token');
if (!token) {
  console.error('❌ No auth token found! Please login.');
} else {
  console.log('✅ Token exists');
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid token format (should have 3 parts)');
    } else {
      const payload = JSON.parse(atob(parts[1]));
      console.log('✅ Token decoded successfully');
      console.log('   User ID:', payload.sub);
      console.log('   Role:', payload.role);
      console.log('   Issued At:', new Date(payload.iat * 1000).toLocaleString());
      console.log('   Expires At:', new Date(payload.exp * 1000).toLocaleString());
      
      const isExpired = Date.now() > payload.exp * 1000;
      if (isExpired) {
        console.error('❌ Token is EXPIRED! Please login again.');
      } else {
        const minutesLeft = Math.floor((payload.exp * 1000 - Date.now()) / 60000);
        console.log(`✅ Token valid (expires in ${minutesLeft} minutes)`);
      }
    }
  } catch (err) {
    console.error('❌ Failed to decode token:', err.message);
  }
}

// 2. Check Backend Connectivity
console.log('\n📡 Step 2: Testing Backend Connection...');
fetch('http://localhost:3000')
  .then(res => {
    if (res.ok) {
      console.log('✅ Backend is reachable at http://localhost:3000');
    } else {
      console.error(`❌ Backend responded with status ${res.status}`);
    }
  })
  .catch(err => {
    console.error('❌ Cannot reach backend:', err.message);
    console.error('   Is the backend running? Run: cd backend && npm run start:dev');
  });

// 3. Check Exam Context
console.log('\n📝 Step 3: Checking Exam Context...');
setTimeout(() => {
  // Access React DevTools to get exam context (if available)
  const examIdFromUrl = new URLSearchParams(window.location.search).get('examId');
  console.log('   URL Param examId:', examIdFromUrl || 'MISSING');
  
  if (!examIdFromUrl) {
    console.warn('⚠️  No examId in URL. Load an exam from the dropdown.');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examIdFromUrl)) {
    console.error('❌ examId is not a valid UUID format');
  } else {
    console.log('✅ examId is valid UUID format');
  }
}, 100);

// 4. Check WebSocket
console.log('\n🔌 Step 4: Checking WebSocket Connection...');
setTimeout(() => {
  // Try to find socket.io instance
  const socketIoDebug = localStorage.getItem('socket.io.debug');
  
  console.log('   Checking for active WebSocket connections...');
  
  if (typeof io !== 'undefined') {
    console.log('✅ Socket.IO client library loaded');
  } else {
    console.error('❌ Socket.IO client library not found');
  }
  
  // Check performance entries for WebSocket
  if (window.performance && window.performance.getEntriesByType) {
    const resources = window.performance.getEntriesByType('resource');
    const socketResources = resources.filter(r => 
      r.name.includes('socket.io') || r.name.includes('notifications')
    );
    
    if (socketResources.length > 0) {
      console.log(`✅ Found ${socketResources.length} WebSocket-related resource(s)`);
      socketResources.forEach(r => {
        console.log(`   - ${r.name}`);
      });
    } else {
      console.warn('⚠️  No WebSocket resources found in performance entries');
    }
  }
}, 200);

// 5. Summary and Recommendations
console.log('\n📊 Step 5: Summary & Recommendations...');
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  
  const hasToken = !!localStorage.getItem('auth_token');
  const hasExamId = !!new URLSearchParams(window.location.search).get('examId');
  
  if (!hasToken) {
    console.log('\n❌ CRITICAL: No auth token');
    console.log('   → Action: Login again');
  }
  
  if (!hasExamId) {
    console.log('\n⚠️  WARNING: No exam ID in URL');
    console.log('   → Action: Load an exam from the workspace dropdown');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check browser console for WebSocket connection messages');
  console.log('   Look for: "✅ WebSocket connected" or "❌ WebSocket disconnected"');
  console.log('');
  console.log('2. Check backend console for connection messages');
  console.log('   Look for: "[NotificationsGateway] Client connected"');
  console.log('');
  console.log('3. Open WebSocket Debug Panel (click Activity icon)');
  console.log('   Should show: Status "Connected" (green)');
  console.log('');
  console.log('4. If still failing, check:');
  console.log('   - Backend is running (npm run start:dev)');
  console.log('   - Backend .env has JWT_SECRET set');
  console.log('   - No firewall blocking localhost:3000');
  console.log('   - Try restarting both backend and frontend');
  console.log('');
  console.log('5. For detailed troubleshooting, see: WEBSOCKET_FIX.md');
  console.log('\n' + '='.repeat(50));
}, 300);

// 6. Live Connection Monitor
console.log('\n🔴 Step 6: Starting Live Connection Monitor...');
console.log('   (Monitoring WebSocket events for 30 seconds)');

let connectionCount = 0;
let disconnectionCount = 0;
let errorCount = 0;

const originalConsoleLog = console.log;
const monitoringStart = Date.now();

const logInterceptor = (...args) => {
  const message = args.join(' ');
  
  if (message.includes('WebSocket connected')) {
    connectionCount++;
    originalConsoleLog('🟢 [MONITOR] WebSocket CONNECTED (#' + connectionCount + ')');
  } else if (message.includes('WebSocket disconnected')) {
    disconnectionCount++;
    originalConsoleLog('🔴 [MONITOR] WebSocket DISCONNECTED (#' + disconnectionCount + ')');
  } else if (message.includes('WebSocket connection error') || message.includes('connect_error')) {
    errorCount++;
    originalConsoleLog('❌ [MONITOR] WebSocket ERROR (#' + errorCount + ')', args);
  }
  
  originalConsoleLog(...args);
};

console.log = logInterceptor;

setTimeout(() => {
  console.log = originalConsoleLog;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 CONNECTION MONITOR RESULTS (30 seconds)');
  console.log('='.repeat(50));
  console.log(`   Connections: ${connectionCount}`);
  console.log(`   Disconnections: ${disconnectionCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (connectionCount === 0) {
    console.error('\n❌ NO CONNECTION ATTEMPTS DETECTED');
    console.log('   Possible causes:');
    console.log('   - WebSocket provider not initialized');
    console.log('   - Token missing (check Step 1)');
    console.log('   - Backend not running');
  } else if (disconnectionCount > connectionCount) {
    console.error('\n❌ MORE DISCONNECTIONS THAN CONNECTIONS');
    console.log('   This indicates a connection stability issue.');
    console.log('   Check backend logs for JWT verification errors.');
  } else if (connectionCount > 0 && disconnectionCount === 0) {
    console.log('\n✅ CONNECTION STABLE');
    console.log('   WebSocket is connected and staying connected!');
  } else if (errorCount > 0) {
    console.error('\n❌ CONNECTION ERRORS DETECTED');
    console.log('   Check error messages above for details.');
  }
  
  console.log('\n🏁 Monitoring complete. Check results above.');
  console.log('='.repeat(50));
}, 30000);

console.log('\n✅ Diagnostic started! Results will appear above and after 30 seconds.\n');
