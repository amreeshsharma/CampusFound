/**
 * CampusFind 2.0 - Phase 8 Automated Test Suite
 * Student & Admin Dashboards, Analytics, and Notification Management Testing
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const { db } = require('../config/db');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { ...headers }
    };

    let postData = null;
    if (body) {
      postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }

        const cookies = res.headers['set-cookie'] || [];
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookies,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function parseAuthCookie(cookies) {
  if (!cookies || !cookies.length) return null;
  const authCookie = cookies.find(c => c.startsWith('token='));
  return authCookie ? authCookie.split(';')[0] : null;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, failureDetails = '') {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    if (failureDetails) console.error(`         Details: ${failureDetails}`);
  }
}

async function runPhase8Tests() {
  console.log('====================================================');
  console.log(' CampusFind 2.0 - Phase 8 Test Suite');
  console.log(' Student & Admin Dashboards, Analytics & Notifications');
  console.log('====================================================\n');

  try {
    // 1. Authenticate Test Actors
    console.log('--- Step 1: Authenticate Test Actors ---');
    const loginResStudent1 = await makeRequest('POST', '/api/auth/login', {
      email: 'student@campus.edu',
      password: 'student123'
    });
    const student1Cookie = parseAuthCookie(loginResStudent1.cookies);
    const student1Id = loginResStudent1.body?.user?.id;
    assert(loginResStudent1.statusCode === 200 && student1Cookie && student1Id, 'Student 1 logs in successfully');

    const loginResStudent2 = await makeRequest('POST', '/api/auth/login', {
      email: 'ananya@campus.edu',
      password: 'student123'
    });
    const student2Cookie = parseAuthCookie(loginResStudent2.cookies);
    const student2Id = loginResStudent2.body?.user?.id;
    assert(loginResStudent2.statusCode === 200 && student2Cookie && student2Id, 'Student 2 logs in successfully');

    const loginResAdmin = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@campusfind.edu',
      password: 'admin123'
    });
    const adminCookie = parseAuthCookie(loginResAdmin.cookies);
    assert(loginResAdmin.statusCode === 200 && adminCookie, 'Admin logs in successfully');

    // 2. Student Dashboard Statistics & Privacy
    console.log('\n--- Step 2: Test Student Dashboard Statistics & Privacy ---');

    // Unauthenticated request should be rejected
    const unauthDashRes = await makeRequest('GET', '/api/dashboard/student-stats');
    assert(unauthDashRes.statusCode === 401, 'Unauthenticated student-stats rejected with 401 Unauthorized');

    // Authenticated Student 1 request
    const student1DashRes = await makeRequest('GET', '/api/dashboard/student-stats', null, { Cookie: student1Cookie });
    assert(student1DashRes.statusCode === 200, 'Student 1 fetches dashboard metrics with 200 OK');

    const s1Metrics = student1DashRes.body?.data?.metrics;
    assert(s1Metrics !== undefined, 'Metrics payload is returned');
    assert(typeof s1Metrics?.total_reports === 'number', 'total_reports is a valid number');
    assert(typeof s1Metrics?.lost_items === 'number', 'lost_items is a valid number');
    assert(typeof s1Metrics?.found_items === 'number', 'found_items is a valid number');
    assert(typeof s1Metrics?.possible_matches === 'number', 'possible_matches is a valid number');
    assert(typeof s1Metrics?.pending_claims === 'number', 'pending_claims is a valid number');
    assert(typeof s1Metrics?.approved_claims === 'number', 'approved_claims is a valid number');

    // Cross-verify against MySQL for Student 1
    const [dbS1Reports] = await db.query('SELECT COUNT(*) as count FROM items WHERE user_id = ?', [student1Id]);
    assert(s1Metrics.total_reports === dbS1Reports[0].count, `Metrics total_reports (${s1Metrics.total_reports}) matches MySQL record (${dbS1Reports[0].count})`);

    // Verify recent reports are scoped to Student 1
    const recentReports = student1DashRes.body?.data?.recent_reports || [];
    assert(Array.isArray(recentReports), 'recent_reports is an array');

    // Privacy Check: Student 2 dashboard returns Student 2's counts
    const student2DashRes = await makeRequest('GET', '/api/dashboard/student-stats', null, { Cookie: student2Cookie });
    const s2Metrics = student2DashRes.body?.data?.metrics;
    const [dbS2Reports] = await db.query('SELECT COUNT(*) as count FROM items WHERE user_id = ?', [student2Id]);
    assert(s2Metrics.total_reports === dbS2Reports[0].count, 'Student 2 dashboard metrics strictly isolate Student 2 data');

    // 3. Admin Dashboard Statistics & Access Control
    console.log('\n--- Step 3: Test Admin Dashboard Statistics & RBAC ---');

    // Student 1 attempts to access admin stats -> 403 Forbidden
    const forbiddenAdminStats = await makeRequest('GET', '/api/dashboard/admin-stats', null, { Cookie: student1Cookie });
    assert(forbiddenAdminStats.statusCode === 403, 'Student access to GET /api/dashboard/admin-stats rejected with 403 Forbidden');

    // Admin fetches admin-stats
    const adminStatsRes = await makeRequest('GET', '/api/dashboard/admin-stats', null, { Cookie: adminCookie });
    assert(adminStatsRes.statusCode === 200, 'Admin fetches admin-stats with 200 OK');

    const kpis = adminStatsRes.body?.data?.kpis;
    assert(kpis !== undefined, 'KPIs payload returned');
    assert(typeof kpis.total_users === 'number', 'kpis.total_users is a number');
    assert(typeof kpis.total_lost === 'number', 'kpis.total_lost is a number');
    assert(typeof kpis.total_found === 'number', 'kpis.total_found is a number');
    assert(typeof kpis.total_claims === 'number', 'kpis.total_claims is a number');
    assert(typeof kpis.pending_claims === 'number', 'kpis.pending_claims is a number');
    assert(typeof kpis.resolved_cases === 'number', 'kpis.resolved_cases is a number');

    // Cross-verify KPI against MySQL database
    const [dbUserCount] = await db.query('SELECT COUNT(*) as count FROM users');
    assert(kpis.total_users === dbUserCount[0].count, `KPI total_users (${kpis.total_users}) matches actual MySQL count (${dbUserCount[0].count})`);

    const recentActivities = adminStatsRes.body?.data?.recent_activities;
    assert(Array.isArray(recentActivities), 'recent_activities is an array of platform events');

    // 4. Visual Analytics API (Chart.js Datasets)
    console.log('\n--- Step 4: Test Visual Analytics API (Chart.js) ---');

    // Student attempts to access analytics -> 403 Forbidden
    const forbiddenAnalytics = await makeRequest('GET', '/api/dashboard/analytics', null, { Cookie: student1Cookie });
    assert(forbiddenAnalytics.statusCode === 403, 'Student access to GET /api/dashboard/analytics rejected with 403 Forbidden');

    // Admin fetches analytics
    const analyticsRes = await makeRequest('GET', '/api/dashboard/analytics', null, { Cookie: adminCookie });
    assert(analyticsRes.statusCode === 200, 'Admin fetches analytics with 200 OK');

    const analyticsData = analyticsRes.body?.data;
    assert(analyticsData?.lostVsFound?.labels?.length === 2, 'Chart 1: Lost vs Found dataset has 2 labels');
    assert(Array.isArray(analyticsData?.monthlyReports?.labels), 'Chart 2: Monthly reports labels array returned');
    assert(Array.isArray(analyticsData?.monthlyReports?.lost), 'Chart 2: Monthly lost counts array returned');
    assert(Array.isArray(analyticsData?.claimStatus?.labels), 'Chart 3: Claim status distribution dataset returned');
    assert(Array.isArray(analyticsData?.categoriesDistribution?.labels), 'Chart 4: Categories distribution dataset returned');

    // 5. Notification Management API Lifecycle
    console.log('\n--- Step 5: Test Notification Management Lifecycle ---');

    // Insert test notification for Student 1
    const [testNotifRes] = await db.query(
      `INSERT INTO notifications (user_id, message, notification_type, is_read) 
       VALUES (?, 'Your lost report has an update regarding potential matches.', 'match', FALSE)`,
      [student1Id]
    );
    const testNotifId = testNotifRes.insertId;
    assert(testNotifId > 0, `Test notification created for Student 1 (ID: ${testNotifId})`);

    // Fetch unread count for Student 1
    const unreadCountRes = await makeRequest('GET', '/api/notifications/unread-count', null, { Cookie: student1Cookie });
    assert(unreadCountRes.statusCode === 200 && unreadCountRes.body?.unread_count >= 1, 'GET /api/notifications/unread-count returns unread count >= 1');

    // Fetch notifications list for Student 1
    const notifsListRes = await makeRequest('GET', '/api/notifications', null, { Cookie: student1Cookie });
    assert(notifsListRes.statusCode === 200, 'GET /api/notifications returns 200 OK');
    const hasTestNotif = notifsListRes.body?.data?.some(n => n.id === testNotifId);
    assert(hasTestNotif, 'Test notification appears in Student 1 feed');

    // Privacy check: Student 2 attempts to mark Student 1's notification as read
    const hijackReadRes = await makeRequest('PUT', `/api/notifications/${testNotifId}/read`, null, { Cookie: student2Cookie });
    assert(hijackReadRes.statusCode === 403, 'Student 2 cannot mark Student 1 notification as read (403 Forbidden)');

    // Student 1 marks their notification as read
    const markReadRes = await makeRequest('PUT', `/api/notifications/${testNotifId}/read`, null, { Cookie: student1Cookie });
    assert(markReadRes.statusCode === 200, 'Student 1 marks notification as read (200 OK)');

    // Verify in database
    const [dbCheckNotif] = await db.query('SELECT is_read FROM notifications WHERE id = ?', [testNotifId]);
    assert(dbCheckNotif[0].is_read === 1, 'Notification is_read flag updated to 1 (true) in MySQL');

    // Mark all as read
    const markAllReadRes = await makeRequest('PUT', '/api/notifications/read-all', null, { Cookie: student1Cookie });
    assert(markAllReadRes.statusCode === 200, 'PUT /api/notifications/read-all succeeds (200 OK)');

    // Delete notification
    const deleteNotifRes = await makeRequest('DELETE', `/api/notifications/${testNotifId}`, null, { Cookie: student1Cookie });
    assert(deleteNotifRes.statusCode === 200, 'DELETE /api/notifications/:id deletes notification (200 OK)');

    // 6. User Management & Category Management APIs
    console.log('\n--- Step 6: Test User & Category Management APIs ---');

    // Student cannot access users list
    const studentUsersRes = await makeRequest('GET', '/api/users', null, { Cookie: student1Cookie });
    assert(studentUsersRes.statusCode === 403, 'Student access to GET /api/users is rejected (403 Forbidden)');

    // Admin accesses users list
    const adminUsersRes = await makeRequest('GET', '/api/users', null, { Cookie: adminCookie });
    assert(adminUsersRes.statusCode === 200 && adminUsersRes.body?.data?.length >= 2, 'Admin accesses GET /api/users (200 OK)');
    const userHasPassword = adminUsersRes.body?.data?.some(u => u.password !== undefined);
    assert(!userHasPassword, 'Security: Password hash omitted from user management payload');

    // Create Category by Admin
    const testCatName = `Test Category ${Date.now().toString(36).toUpperCase()}`;
    const createCatRes = await makeRequest('POST', '/api/categories', {
      category_name: testCatName,
      description: 'Temporary testing category'
    }, { Cookie: adminCookie });
    assert(createCatRes.statusCode === 201, `Admin creates new category "${testCatName}" (201 Created)`);
    const newCatId = createCatRes.body?.data?.id;

    // Student cannot create category
    const studentCreateCatRes = await makeRequest('POST', '/api/categories', {
      category_name: 'Hacked Category'
    }, { Cookie: student1Cookie });
    assert(studentCreateCatRes.statusCode === 403, 'Student cannot create category (403 Forbidden)');

    // Duplicate category rejected
    const duplicateCatRes = await makeRequest('POST', '/api/categories', {
      category_name: testCatName
    }, { Cookie: adminCookie });
    assert(duplicateCatRes.statusCode === 409, 'Duplicate category name rejected (409 Conflict)');

    // Cleanup test category
    if (newCatId) {
      await db.query('DELETE FROM categories WHERE id = ?', [newCatId]);
    }

    console.log('\n====================================================');
    console.log(` PHASE 8 TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('====================================================');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    console.error('Fatal test execution error:', error);
    process.exit(1);
  }
}

runPhase8Tests();

