// Test script for authentication and canvas usage
// Run with: node test-auth-canvas.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const AUTH_BASE_URL = 'http://localhost:3006/auth';
const CANVAS_BASE_URL = 'http://localhost:3000/canvas';

async function testAuthAndCanvas() {
  try {
    console.log('=== Testing Authentication and Canvas ===\n');

    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await fetch(`${AUTH_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
      }),
    });

    if (!registerResponse.ok) {
      console.log('Registration failed, user might already exist. Proceeding to login...');
    } else {
      const registerData = await registerResponse.json();
      console.log('Registration successful:', registerData);
    }

    // Step 2: Login to get JWT token
    console.log('\n2. Logging in...');
    const loginResponse = await fetch(`${AUTH_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    console.log('Login successful');

    // Extract JWT token from cookies (assuming it's set in cookies)
    const cookies = loginResponse.headers.get('set-cookie');
    const tokenMatch = cookies?.match(/access_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      throw new Error('No JWT token found in response');
    }

    console.log('JWT token obtained');

    // Step 3: Test canvas endpoints with authentication
    console.log('\n3. Testing canvas endpoints...');

    // Get canvas state
    console.log('Getting canvas state for room "test-room"...');
    const getCanvasResponse = await fetch(`${CANVAS_BASE_URL}/test-room`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (getCanvasResponse.ok) {
      const canvasData = await getCanvasResponse.json();
      console.log('Canvas state:', canvasData);
    } else {
      console.log('Get canvas failed:', getCanvasResponse.status, getCanvasResponse.statusText);
    }

    // Update canvas with draw data
    console.log('\nUpdating canvas with draw data...');
    const drawData = {
      type: 'line',
      startX: 100,
      startY: 100,
      endX: 200,
      endY: 200,
      color: '#000000',
      width: 2,
    };

    const updateCanvasResponse = await fetch(`${CANVAS_BASE_URL}/test-room/draw`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(drawData),
    });

    if (updateCanvasResponse.ok) {
      const updateData = await updateCanvasResponse.json();
      console.log('Canvas updated successfully:', updateData);
    } else {
      console.log('Update canvas failed:', updateCanvasResponse.status, updateCanvasResponse.statusText);
      const errorText = await updateCanvasResponse.text();
      console.log('Error details:', errorText);
    }

    // Get updated canvas state
    console.log('\nGetting updated canvas state...');
    const getUpdatedCanvasResponse = await fetch(`${CANVAS_BASE_URL}/test-room`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (getUpdatedCanvasResponse.ok) {
      const updatedCanvasData = await getUpdatedCanvasResponse.json();
      console.log('Updated canvas state:', updatedCanvasData);
    } else {
      console.log('Get updated canvas failed:', getUpdatedCanvasResponse.status, getUpdatedCanvasResponse.statusText);
    }

    // Clear canvas
    console.log('\nClearing canvas...');
    const clearCanvasResponse = await fetch(`${CANVAS_BASE_URL}/test-room`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (clearCanvasResponse.ok) {
      const clearData = await clearCanvasResponse.json();
      console.log('Canvas cleared:', clearData);
    } else {
      console.log('Clear canvas failed:', clearCanvasResponse.status, clearCanvasResponse.statusText);
    }

    console.log('\n=== Test completed successfully ===');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAuthAndCanvas();
