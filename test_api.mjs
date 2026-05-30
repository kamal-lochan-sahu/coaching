import http from 'http';

async function fetchAPI(path, options = {}) {
  const res = await fetch(`http://localhost:5000${path}`, options);
  const data = await res.json();
  return { status: res.status, success: data.success, data };
}

async function run() {
  const loginRes = await fetchAPI('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kamal@test.com', password: 'test1234' })
  });
  
  if (!loginRes.success) {
    console.log("Login failed", loginRes);
    return;
  }
  
  const token = loginRes.data.accessToken || loginRes.data.token || loginRes.data.data?.accessToken;
  const realToken = token || (loginRes.data.data && loginRes.data.data.token);
  
  const headers = { 'Authorization': `Bearer ${realToken}` };
  
  const tests = [
    '/api/analytics/dashboard',
    '/api/students?status=active&limit=10',
    '/api/batches',
    '/api/fees/pending',
    '/api/analytics/revenue',
    '/api/enquiries/stats',
    '/api/notifications/history'
  ];
  
  for (const test of tests) {
    const res = await fetchAPI(test, { headers });
    console.log(`GET ${test} -> Status: ${res.status}, Success: ${res.success}`);
  }
}

run();
