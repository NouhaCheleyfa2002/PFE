/**
 * Test script to verify notification system
 * Run with: node test-notification.js
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

async function testNotifications() {
  console.log('=== Testing Notification System ===\n');

  // 1. Register a new user
  console.log('1. Registering new test user...');
  try {
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test.user.${Date.now()}@example.com`,
        password: 'Test123!@#',
        fullName: 'Test User for Notifications',
        role: 'student',
      }),
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✓ User registered successfully');
      console.log(`  User ID: ${registerData.user.id}`);
      console.log(`  Email: ${registerData.user.email}`);
      console.log(`  Token: ${registerData.access_token.substring(0, 20)}...`);
      
      // 2. Check if admin received notification
      console.log('\n2. Checking admin notifications...');
      console.log('   Please log in as admin and check if you received a notification about the new user');
      console.log('   The notification should say: "Test User for Notifications registered as student."');
      console.log('   Action URL should be: /dashboard/admin/users?userId=' + registerData.user.id);
      
    } else {
      const error = await registerResponse.json();
      console.error('✗ Registration failed:', error);
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

testNotifications();
