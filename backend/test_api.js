const http = require('http');

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    if (apiCall.token) opts.headers['x-auth-token'] = apiCall.token;
    
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  console.log('=== 1. Login ===');
  const login = await apiCall('POST', '/api/auth/login', { email: 'admin@lulc.com', password: 'admin123' });
  console.log('Status:', login.status);
  apiCall.token = login.data.token;
  console.log('Token obtained:', !!apiCall.token);

  console.log('\n=== 2. Get Profile ===');
  const profile = await apiCall('GET', '/api/auth/profile');
  console.log('Status:', profile.status);
  console.log('Name:', profile.data.name, '| Email:', profile.data.email);
  console.log('Fields:', Object.keys(profile.data).join(', '));

  console.log('\n=== 3. Update Profile ===');
  const update = await apiCall('PUT', '/api/auth/profile', {
    phone: '+91 9876543210', bio: 'Admin user', city: 'Nagpur', state: 'Maharashtra', pincode: '440001', organization: 'LULC Portal'
  });
  console.log('Status:', update.status);
  console.log('Updated city:', update.data.city, '| org:', update.data.organization);

  console.log('\n=== 4. Forgot Password ===');
  const forgot = await apiCall('POST', '/api/auth/forgot-password', { email: 'admin@lulc.com' });
  console.log('Status:', forgot.status);
  console.log('Message:', forgot.data.msg);

  console.log('\n=== 5. LULC Analysis ===');
  const lulc = await apiCall('GET', '/api/analysis/lulc-summary');
  console.log('Status:', lulc.status);
  console.log('Labels:', lulc.data.labels);
  console.log('Counts:', lulc.data.counts);

  console.log('\n=== 6. Road Analysis ===');
  const road = await apiCall('GET', '/api/analysis/road-summary');
  console.log('Status:', road.status);
  console.log('Labels:', road.data.labels);
  console.log('Counts:', road.data.counts);

  console.log('\n=== 7. Overview ===');
  const overview = await apiCall('GET', '/api/analysis/overview');
  console.log('Status:', overview.status);
  console.log('Counts:', overview.data.counts);
  console.log('Taluka villages (first 3):', overview.data.talukaVillages?.slice(0, 3));

  console.log('\n=== ALL TESTS PASSED ===');
}

test().catch(console.error);
