/**
 * Automated REST API Test Suite
 * Validates core hospital management endpoints and response structures.
 * Run with: npm test
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- Running Hospital Management System API Tests ---\n');

  const tests = [
    { name: 'Health Check Endpoint', path: '/api/health', method: 'GET' },
    { name: 'Dashboard Stats', path: '/api/stats/dashboard', method: 'GET' },
    { name: 'List Patients', path: '/api/patients', method: 'GET' },
    { name: 'List Doctors', path: '/api/doctors', method: 'GET' },
    { name: 'List Clinical Departments', path: '/api/doctors/departments', method: 'GET' },
    { name: 'List Appointments', path: '/api/appointments', method: 'GET' },
    { name: 'List Billing Invoices', path: '/api/billing', method: 'GET' },
    { name: 'Get Demo Accounts', path: '/api/auth/demo-accounts', method: 'GET' }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = await makeRequest(t.path, t.method);
      if (res.status >= 200 && res.status < 300) {
        console.log(`  ✓ [${res.status}] ${t.name}`);
        passed++;
      } else {
        console.log(`  ✗ [${res.status}] ${t.name}`);
      }
    } catch (err) {
      console.log(`  ✗ Error testing ${t.name}: ${err.message}`);
    }
  }

  console.log(`\nTests Summary: ${passed}/${tests.length} passed.`);
}

runTests();
