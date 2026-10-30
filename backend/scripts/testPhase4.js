/**
 * CampusFind 2.0 - Phase 4 Authentication & Security Test Suite
 * Validates registration, duplication, login, bad password, invalid/expired tokens, RBAC, and logout
 */

const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'campusfind_super_secure_jwt_secret_key_change_in_production_2026';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName} ${details}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} - ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log(' CampusFind 2.0: Running Phase 4 Authentication Tests   ');
  console.log('========================================================\n');

  // Test 1: Successful Student Registration
  console.log('Test 1: Successful Registration');
  const regEmail = `test.student.${Date.now()}@campus.edu`;
  const regRes = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vikram Singh',
      email: regEmail,
      password: 'mypassword123',
      confirmPassword: 'mypassword123',
      student_id: '23CSE110',
      department: 'Computer Science & Engineering'
    })
  });
  const regData = await regRes.json();
  const setCookieHeader = regRes.headers.get('set-cookie');

  assert(regRes.status === 201, 'Status is 201 Created', `Got ${regRes.status}`);
  assert(regData.success === true, 'Response success is true');
  assert(regData.user.role === 'student', 'Enforces student role', `Role: ${regData.user.role}`);
  assert(!regData.user.password, 'Password hash is NEVER returned in response');
  assert(setCookieHeader && setCookieHeader.includes('token='), 'HTTP-only token cookie issued in headers');

  // Test 2: Duplicate Registration Attempt
  console.log('\nTest 2: Duplicate Registration Check');
  const dupRes = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vikram Clone',
      email: regEmail, // Same email as Test 1
      password: 'password999',
      confirmPassword: 'password999'
    })
  });
  const dupData = await dupRes.json();
  assert(dupRes.status === 409, 'Status is 409 Conflict', `Got ${dupRes.status}`);
  assert(dupData.success === false, 'Duplicate rejected with error message');

  // Test 3: Successful Login with Seeded Student
  console.log('\nTest 3: Successful Login');
  const loginRes = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@campus.edu',
      password: 'student123'
    })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, 'Status is 200 OK', `Got ${loginRes.status}`);
  assert(loginData.success === true, 'Login successful');
  assert(Boolean(loginData.token), 'JWT token string returned');
  const studentToken = loginData.token;

  // Test 4: Incorrect Password Attempt
  console.log('\nTest 4: Incorrect Password Handling');
  const badPassRes = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@campus.edu',
      password: 'completely_wrong_password'
    })
  });
  const badPassData = await badPassRes.json();
  assert(badPassRes.status === 401, 'Status is 401 Unauthorized', `Got ${badPassRes.status}`);
  assert(badPassData.success === false, 'Incorrect password rejected');

  // Test 5: Invalid Token on Protected Route
  console.log('\nTest 5: Invalid Token on GET /api/auth/me');
  const invalidTokenRes = await fetch(`${API_BASE}/me`, {
    headers: { 'Authorization': 'Bearer this_is_an_invalid_token_xyz' }
  });
  const invalidTokenData = await invalidTokenRes.json();
  assert(invalidTokenRes.status === 401, 'Status is 401 Unauthorized', `Got ${invalidTokenRes.status}`);
  assert(invalidTokenData.message.includes('Invalid'), 'Message identifies invalid token');

  // Test 6: Expired Token on Protected Route
  console.log('\nTest 6: Expired Token on GET /api/auth/me');
  const expiredToken = jwt.sign({ id: 1, email: 'student@campus.edu', role: 'student' }, JWT_SECRET, { expiresIn: '1ms' });
  await new Promise(r => setTimeout(r, 20)); // wait for token to expire

  const expiredTokenRes = await fetch(`${API_BASE}/me`, {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  });
  const expiredTokenData = await expiredTokenRes.json();
  assert(expiredTokenRes.status === 401, 'Status is 401 Unauthorized', `Got ${expiredTokenRes.status}`);
  assert(expiredTokenData.message.includes('expired'), 'Message identifies expired token');

  // Test 7: Student Access to Admin Route (RBAC)
  console.log('\nTest 7: Role Authorization - Student attempting Admin Route');
  const rbacRes = await fetch(`${API_BASE}/admin-only`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const rbacData = await rbacRes.json();
  assert(rbacRes.status === 403, 'Status is 403 Forbidden', `Got ${rbacRes.status}`);
  assert(rbacData.success === false, 'Access forbidden for student on admin endpoint');

  // Test 8: Admin Access to Admin Route (RBAC)
  console.log('\nTest 8: Role Authorization - Admin accessing Admin Route');
  const adminLoginRes = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@campusfind.edu',
      password: 'admin123'
    })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  const adminAccessRes = await fetch(`${API_BASE}/admin-only`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminAccessData = await adminAccessRes.json();
  assert(adminAccessRes.status === 200, 'Status is 200 OK for Admin', `Got ${adminAccessRes.status}`);
  assert(adminAccessData.user.role === 'admin', 'Identified as administrator');

  // Test 9: Logout
  console.log('\nTest 9: Logout');
  const logoutRes = await fetch(`${API_BASE}/logout`, {
    method: 'POST'
  });
  const logoutData = await logoutRes.json();
  const logoutCookie = logoutRes.headers.get('set-cookie');
  assert(logoutRes.status === 200, 'Status is 200 OK', `Got ${logoutRes.status}`);
  assert(logoutData.success === true, 'Logout succeeded');
  assert(logoutCookie && (logoutCookie.includes('token=;') || logoutCookie.includes('Max-Age=0') || logoutCookie.includes('Expires=')), 'Token cookie cleared/invalidated');

  console.log('\n========================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

