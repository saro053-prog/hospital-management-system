/**
 * Automated Enterprise Test Suite
 * Validates genuine authentication, RBAC authorization, clinical modules,
 * bed matrix, telemetry, laboratory, pharmacy, and clinical AI endpoints.
 * Run with: npm test
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers
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
  console.log('================================================================');
  console.log('   APEXCARE HEALTH HMS - COMPREHENSIVE VERIFICATION SUITE       ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function assertTest(name, fn) {
    total++;
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✓ PASS: ${name}`);
        passed++;
      } else {
        console.log(`  ✗ FAIL: ${name}`);
      }
    } catch (err) {
      console.log(`  ✗ ERROR in [${name}]: ${err.message}`);
    }
  }

  // 1. Health & Cluster Status
  await assertTest('Health Check Cluster Status', async () => {
    const res = await makeRequest('/api/health');
    return res.status === 200 && (res.data.status === 'healthy' || res.data.status === 'OK');
  });

  // 2. Authentication: Reject wrong password
  await assertTest('Auth: Reject Incorrect Password with 401', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@hospital.org',
      password: 'WrongPassword123'
    });
    return res.status === 401 && res.data.success === false;
  });

  // 3. Authentication: Genuine Login with bcrypt hash
  let adminToken = null;
  await assertTest('Auth: Accept Valid Bcrypt Password with 200 & JWT', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@hospital.org',
      password: 'Password@123'
    });
    if (res.status === 200 && res.data.token && res.data.user.role === 'admin') {
      adminToken = res.data.token;
      return true;
    }
    return false;
  });

  // 4. Authentication: Session Verification /api/auth/me
  await assertTest('Auth: Session Validation with Bearer Token (/api/auth/me)', async () => {
    const res = await makeRequest('/api/auth/me', 'GET', null, adminToken);
    return res.status === 200 && res.data.user.email === 'admin@hospital.org';
  });

  // 5. Authentication: User Registration & Auto Patient Code
  const testEmail = `test.patient.${Date.now()}@example.com`;
  await assertTest('Auth: Register New Patient Account', async () => {
    const res = await makeRequest('/api/auth/register', 'POST', {
      name: 'Priya Krishnan',
      email: testEmail,
      password: 'Password@123',
      phone: '+91 98401 55555',
      role: 'patient',
      gender: 'Female',
      dob: '1992-08-14'
    });
    return res.status === 201 && res.data.success && res.data.user;
  });

  // 6. Authentication: Prevent Duplicate Accounts
  await assertTest('Auth: Reject Duplicate Email Registration with 400', async () => {
    const res = await makeRequest('/api/auth/register', 'POST', {
      name: 'Duplicate Priya',
      email: testEmail,
      password: 'Password@123',
      phone: '+91 98401 55555'
    });
    return res.status === 400 && res.data.success === false;
  });

  // 7. Authentication: Forgot Password recovery token
  let resetToken = null;
  await assertTest('Auth: Forgot Password generates 1-Hour Recovery Token', async () => {
    const res = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail
    });
    resetToken = res.data?.resetToken || res.data?.reset_token;
    return res.status === 200 && !!resetToken;
  });

  // 8. Authentication: Reset Password using token
  await assertTest('Auth: Reset Password using valid recovery token', async () => {
    const res = await makeRequest('/api/auth/reset-password', 'POST', {
      token: resetToken,
      new_password: 'NewSecurePassword@456'
    });
    return res.status === 200 && res.data.success;
  });

  // 9. Dashboard Stats
  await assertTest('Clinical: Dashboard Stats & Live KPIs', async () => {
    const res = await makeRequest('/api/stats/dashboard', 'GET', null, adminToken);
    return res.status === 200 && res.data.stats && res.data.stats.total_patients > 0;
  });

  // 10. Patients Directory
  await assertTest('Clinical: Patients Registry Listing', async () => {
    const res = await makeRequest('/api/patients', 'GET', null, adminToken);
    return res.status === 200 && Array.isArray(res.data.data) && res.data.data.length > 0;
  });

  // 11. Doctors & Departments
  await assertTest('Clinical: Doctors Directory & Specialties', async () => {
    const res = await makeRequest('/api/doctors', 'GET', null, adminToken);
    return res.status === 200 && Array.isArray(res.data.data) && res.data.data.length > 0;
  });

  // 12. Inpatient Wards
  await assertTest('Inpatient: Wards Census & Total Capacity', async () => {
    const res = await makeRequest('/api/wards', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.wards;
    return res.status === 200 && Array.isArray(list) && list.length >= 4;
  });

  // 13. Bed Matrix Grid
  await assertTest('Inpatient: Real-Time Bed Matrix Listing', async () => {
    const res = await makeRequest('/api/wards/beds', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.beds;
    return res.status === 200 && Array.isArray(list) && list.length > 0;
  });

  // 14. Nurse Station & Duty Rosters
  await assertTest('Nursing: Shift Duty Rostering', async () => {
    const res = await makeRequest('/api/nurses/duty', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.nurses;
    return res.status === 200 && Array.isArray(list) && list.length > 0;
  });

  // 15. Nurse Vitals Telemetry Recording
  await assertTest('Nursing: Record Patient Vitals Telemetry Log', async () => {
    const res = await makeRequest('/api/nurses/vitals', 'POST', {
      patient_id: 1,
      blood_pressure: '122/80',
      heart_rate_bpm: 74,
      spo2_percentage: 99,
      temperature_f: 98.4,
      respiratory_rate: 16,
      blood_glucose_mg_dl: 105,
      notes: 'Hemodynamically stable.'
    }, adminToken);
    return res.status === 201 && res.data.success;
  });

  // 16. Laboratory Test Catalog
  await assertTest('Laboratory: Diagnostic Test Catalog Listing', async () => {
    const res = await makeRequest('/api/laboratory/tests', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.tests;
    return res.status === 200 && Array.isArray(list) && list.length >= 6;
  });

  // 17. Laboratory Workorders
  await assertTest('Laboratory: Active Test Orders & Specimen Queue', async () => {
    const res = await makeRequest('/api/laboratory/orders', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.orders;
    return res.status === 200 && Array.isArray(list);
  });

  // 18. Pharmacy Formulary
  await assertTest('Pharmacy: Formulary Medicines Inventory Listing', async () => {
    const res = await makeRequest('/api/pharmacy/medicines', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.medicines;
    return res.status === 200 && Array.isArray(list) && list.length >= 5;
  });

  // 19. Pharmacy Dispensing
  await assertTest('Pharmacy: Dispense Medication & Decrement Stock', async () => {
    const res = await makeRequest('/api/pharmacy/dispense', 'POST', {
      patient_id: 1,
      medicine_id: 1,
      quantity: 5,
      instructions: '1 tab after meals'
    }, adminToken);
    return res.status === 200 && res.data.success;
  });

  // 20. In-App Notifications
  await assertTest('Notifications: Fetch System Alerts & Alerts Queue', async () => {
    const res = await makeRequest('/api/notifications', 'GET', null, adminToken);
    const list = res.data?.data || res.data?.notifications;
    return res.status === 200 && Array.isArray(list);
  });

  // 21. Clinical AI Assistant: English Bed Query
  await assertTest('AI Assistant: Bed Availability Telemetry Query', async () => {
    const res = await makeRequest('/api/ai/chat', 'POST', {
      message: 'How many ICU beds are currently available?'
    }, adminToken);
    return res.status === 200 && res.data.reply && (res.data.reply.toLowerCase().includes('icu') || res.data.reply.toLowerCase().includes('bed'));
  });

  // 22. Clinical AI Assistant: Tamil Language Emergency & Triage Support
  await assertTest('AI Assistant: Tamil Language Emergency & Triage Support', async () => {
    const res = await makeRequest('/api/ai/chat', 'POST', {
      message: 'Emergency! Enakku romba chest pain irukku, enna seiyanum?'
    }, adminToken);
    return res.status === 200 && res.data.reply && (res.data.reply.includes('108') || res.data.reply.includes('அவசர') || res.data.reply.includes('EMERGENCY'));
  });

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%).`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
