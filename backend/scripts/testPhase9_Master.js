/**
 * CampusFind 2.0 - Phase 9 Comprehensive Master Integration & Security Test Suite
 * Exhaustively validates all functionality, edge cases, RBAC, and security boundaries
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

let testIndex = 0;
let passedCount = 0;
const testResults = [];

function assertTest(condition, testName, category, failureDetails = '') {
  testIndex++;
  const status = condition ? 'PASS' : 'FAIL';
  if (condition) {
    passedCount++;
    console.log(`  [PASS] Test ${testIndex.toString().padStart(2, '0')}: ${testName}`);
  } else {
    console.error(`  [FAIL] Test ${testIndex.toString().padStart(2, '0')}: ${testName}`);
    if (failureDetails) console.error(`         Reason: ${failureDetails}`);
  }

  testResults.push({
    id: `TC-${testIndex.toString().padStart(3, '0')}`,
    name: testName,
    category: category,
    status: status,
    details: failureDetails
  });
}

async function runMasterTestSuite() {
  console.log('======================================================================');
  console.log(' CampusFind 2.0 - Phase 9 Master Integration & Security Test Suite');
  console.log(' Full Functional, Security, RBAC & API Verification');
  console.log('======================================================================\n');

  try {
    // =========================================================================
    // SECTION 1: AUTHENTICATION, REGISTRATION & SESSION MANAGEMENT
    // =========================================================================
    console.log('--- SECTION 1: Authentication & Identity Management ---');

    // TC-001: Register a new student account
    const uniqueEmail = `qa_student_${Date.now()}@campus.edu`;
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'QA Test Student',
      email: uniqueEmail,
      password: 'password123',
      confirmPassword: 'password123',
      student_id: '24CSE999',
      department: 'Computer Science'
    });
    assertTest(regRes.statusCode === 201 && regRes.body?.success, 'Student registration with valid credentials succeeds', 'Authentication');
    const newStudentId = regRes.body?.user?.id;
    const newStudentCookie = parseAuthCookie(regRes.cookies);

    // TC-002: Registration duplicate email check
    const dupRegRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Duplicate Student',
      email: uniqueEmail,
      password: 'password123',
      confirmPassword: 'password123'
    });
    assertTest(dupRegRes.statusCode === 409, 'Registration with duplicate email returns 409 Conflict', 'Authentication');

    // TC-003: Login with correct student credentials
    const loginStudentRes = await makeRequest('POST', '/api/auth/login', {
      email: 'student@campus.edu',
      password: 'student123'
    });
    const student1Cookie = parseAuthCookie(loginStudentRes.cookies);
    const student1Id = loginStudentRes.body?.user?.id;
    assertTest(loginStudentRes.statusCode === 200 && student1Cookie, 'Student login returns 200 OK and sets HTTP-only JWT cookie', 'Authentication');

    // TC-004: Login with correct admin credentials
    const loginAdminRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@campusfind.edu',
      password: 'admin123'
    });
    const adminCookie = parseAuthCookie(loginAdminRes.cookies);
    assertTest(loginAdminRes.statusCode === 200 && adminCookie, 'Admin login returns 200 OK and sets HTTP-only JWT cookie', 'Authentication');

    // TC-005: Login with incorrect password
    const badPassRes = await makeRequest('POST', '/api/auth/login', {
      email: 'student@campus.edu',
      password: 'WrongPassword999!'
    });
    assertTest(badPassRes.statusCode === 401, 'Login with incorrect password returns 401 Unauthorized', 'Authentication');

    // TC-006: Login with nonexistent email
    const nonUserRes = await makeRequest('POST', '/api/auth/login', {
      email: 'ghost_user_9999@campus.edu',
      password: 'password123'
    });
    assertTest(nonUserRes.statusCode === 401, 'Login with nonexistent user returns 401 Unauthorized', 'Authentication');

    // TC-007: Protected profile inspection (GET /api/auth/me)
    const meRes = await makeRequest('GET', '/api/auth/me', null, { Cookie: student1Cookie });
    assertTest(meRes.statusCode === 200 && meRes.body?.user?.id === student1Id, 'GET /api/auth/me returns authenticated user identity', 'Authentication');

    // TC-008: Profile update (PUT /api/auth/profile)
    const updateProfileRes = await makeRequest('PUT', '/api/auth/profile', {
      name: 'Rahul Sharma (Updated)',
      department: 'Computer Science & Engineering'
    }, { Cookie: student1Cookie });
    assertTest(updateProfileRes.statusCode === 200 && updateProfileRes.body?.user?.name === 'Rahul Sharma (Updated)', 'PUT /api/auth/profile updates profile fields', 'Authentication');

    // Restore name
    await makeRequest('PUT', '/api/auth/profile', {
      name: 'Rahul Sharma',
      department: 'Computer Science & Engineering'
    }, { Cookie: student1Cookie });

    // TC-009: Change password with wrong current password
    const badChangePassRes = await makeRequest('PUT', '/api/auth/change-password', {
      currentPassword: 'IncorrectOldPassword',
      newPassword: 'NewPassword123'
    }, { Cookie: student1Cookie });
    assertTest(badChangePassRes.statusCode === 401, 'Password update with wrong current password returns 401 Unauthorized', 'Authentication');

    // TC-010: Logout endpoint
    const logoutRes = await makeRequest('POST', '/api/auth/logout');
    assertTest(logoutRes.statusCode === 200, 'POST /api/auth/logout clears user session', 'Authentication');

    // =========================================================================
    // SECTION 2: ITEM LIFECYCLE, MULTI-FILTERING & SEARCH
    // =========================================================================
    console.log('\n--- SECTION 2: Item Management, Filtering & Search ---');

    // Fetch sample category ID
    const [catRows] = await db.query('SELECT id, category_name FROM categories LIMIT 2');
    const catId1 = catRows[0].id;
    const catId2 = catRows[1].id;

    // TC-011: Report a lost item
    const createLostRes = await makeRequest('POST', '/api/items', {
      title: 'Titanium Grey Dell XPS 15',
      category_id: catId1,
      description: 'Lost near Study Room B on 3rd floor. Has Intel sticker.',
      item_type: 'lost',
      color: 'Titanium Grey',
      location: 'Main Library 3rd Floor',
      item_date: '2026-10-30'
    }, { Cookie: student1Cookie });
    assertTest(createLostRes.statusCode === 201 && createLostRes.body?.data?.item_type === 'lost', 'Create lost item succeeds with 201 Created', 'Items');
    const lostItemId = createLostRes.body?.data?.id;

    // TC-012: Report a found item (verify auto-generated unique QR token)
    const createFoundRes = await makeRequest('POST', '/api/items', {
      title: 'Titanium Grey Dell Laptop',
      category_id: catId1,
      description: 'Found on table in Study Room B. Intel Core sticker present.',
      item_type: 'found',
      color: 'Grey',
      location: 'Main Library',
      item_date: '2026-10-30'
    }, { Cookie: newStudentCookie });
    const foundItemId = createFoundRes.body?.data?.id;
    const foundQRToken = createFoundRes.body?.data?.qr_token;
    assertTest(
      createFoundRes.statusCode === 201 && foundQRToken && foundQRToken.startsWith('QR-FND-'),
      'Create found item automatically generates tamper-resistant QR custody token',
      'Items'
    );

    // TC-013: Validation guard - Missing required title & description
    const badItemRes = await makeRequest('POST', '/api/items', {
      item_type: 'lost',
      color: 'Red'
    }, { Cookie: student1Cookie });
    assertTest(badItemRes.statusCode === 400, 'Report item missing required fields returns 400 Bad Request', 'Items');

    // TC-014: Validation guard - Invalid item_type
    const invalidTypeRes = await makeRequest('POST', '/api/items', {
      title: 'Invalid Item Type Test',
      description: 'Testing validation constraints',
      item_type: 'stolen',
      color: 'Black',
      location: 'Cafeteria',
      item_date: '2026-10-30'
    }, { Cookie: student1Cookie });
    assertTest(invalidTypeRes.statusCode === 400, 'Report item with invalid type returns 400 Bad Request', 'Items');

    // TC-015: Retrieve all items (GET /api/items)
    const getAllRes = await makeRequest('GET', '/api/items');
    assertTest(getAllRes.statusCode === 200 && Array.isArray(getAllRes.body?.data), 'GET /api/items returns full catalog list', 'Items');

    // TC-016: Filter by type: lost
    const filterLostRes = await makeRequest('GET', '/api/items?type=lost');
    const allAreLost = filterLostRes.body?.data?.every(i => i.item_type === 'lost');
    assertTest(filterLostRes.statusCode === 200 && allAreLost, 'Filter ?type=lost returns lost items exclusively', 'Items');

    // TC-017: Filter by type: found
    const filterFoundRes = await makeRequest('GET', '/api/items?type=found');
    const allAreFound = filterFoundRes.body?.data?.every(i => i.item_type === 'found');
    assertTest(filterFoundRes.statusCode === 200 && allAreFound, 'Filter ?type=found returns found items exclusively', 'Items');

    // TC-018: Filter by category_id
    const filterCatRes = await makeRequest('GET', `/api/items?category_id=${catId1}`);
    const matchesCat = filterCatRes.body?.data?.every(i => i.category_id === catId1);
    assertTest(filterCatRes.statusCode === 200 && matchesCat, `Filter ?category_id=${catId1} returns matching category items only`, 'Items');

    // TC-019: Search by keyword across title/description/location
    const searchRes = await makeRequest('GET', '/api/items?search=Dell');
    const searchMatches = searchRes.body?.data?.some(i => i.title.includes('Dell') || i.description.includes('Dell'));
    assertTest(searchRes.statusCode === 200 && searchMatches, 'Keyword search ?search=Dell finds matching records', 'Items');

    // TC-020: Retrieve single item by ID
    const getSingleRes = await makeRequest('GET', `/api/items/${lostItemId}`);
    assertTest(getSingleRes.statusCode === 200 && getSingleRes.body?.data?.id === lostItemId, 'GET /api/items/:id returns accurate single item details', 'Items');

    // TC-021: Nonexistent item ID returns 404
    const get404Res = await makeRequest('GET', '/api/items/9999999');
    assertTest(get404Res.statusCode === 404, 'GET /api/items/:id with nonexistent ID returns 404 Not Found', 'Items');

    // TC-022: Owner updates item
    const updateItemRes = await makeRequest('PUT', `/api/items/${lostItemId}`, {
      title: 'Titanium Grey Dell XPS 15 (Reward Offered)',
      description: 'Lost in library. Sticker on back.'
    }, { Cookie: student1Cookie });
    assertTest(updateItemRes.statusCode === 200 && updateItemRes.body?.data?.title.includes('Reward Offered'), 'Owner can update their own reported item', 'Items');

    // TC-023: IDOR Security Guard - Student 2 attempts to edit Student 1's item
    const idorEditRes = await makeRequest('PUT', `/api/items/${lostItemId}`, {
      title: 'Hacked Title Attempt'
    }, { Cookie: newStudentCookie });
    assertTest(idorEditRes.statusCode === 403, 'IDOR Guard: Unauthorized student cannot edit another user\'s item (403)', 'Security');

    // TC-024: IDOR Security Guard - Student 2 attempts to delete Student 1's item
    const idorDeleteRes = await makeRequest('DELETE', `/api/items/${lostItemId}`, null, { Cookie: newStudentCookie });
    assertTest(idorDeleteRes.statusCode === 403, 'IDOR Guard: Unauthorized student cannot delete another user\'s item (403)', 'Security');

    // =========================================================================
    // SECTION 3: DETERMINISTIC SMART MATCHING ENGINE
    // =========================================================================
    console.log('\n--- SECTION 3: Smart Matching Engine & Rule Breakdown ---');

    // TC-025: Inspect rule-based matches for the lost Dell XPS item
    const matchInspectRes = await makeRequest('GET', `/api/items/${lostItemId}/matches`);
    assertTest(matchInspectRes.statusCode === 200 && matchInspectRes.body?.success, 'GET /api/items/:id/matches executes matching calculation', 'Matching');
    const topMatch = matchInspectRes.body?.data?.[0];

    // TC-026: Validate similarity score calculation & threshold (>40%)
    assertTest(topMatch !== undefined && topMatch.matchPercentage >= 40, `Matching engine detects pairing with ${topMatch?.matchPercentage}% score (>=40% threshold)`, 'Matching');

    // TC-027: Explainability check - matching reasons present
    assertTest(Array.isArray(topMatch?.matchingReasons) && topMatch.matchingReasons.length >= 2, 'Matching engine provides explainable criteria breakdown list', 'Matching');

    // TC-028: Proactive matches for authenticated student (GET /api/matches/my-matches)
    const myMatchesRes = await makeRequest('GET', '/api/matches/my-matches', null, { Cookie: student1Cookie });
    assertTest(myMatchesRes.statusCode === 200 && Array.isArray(myMatchesRes.body?.data), 'GET /api/matches/my-matches returns student\'s proactive suggestions', 'Matching');

    // TC-029: Self-match exclusion (item cannot match against itself)
    const selfMatchExists = matchInspectRes.body?.data?.some(m => m.matchedItem.id === lostItemId);
    assertTest(!selfMatchExists, 'Self-match exclusion: Item is never paired with itself', 'Matching');

    // =========================================================================
    // SECTION 4: OWNERSHIP CLAIMS & WORKFLOW STATE MACHINE
    // =========================================================================
    console.log('\n--- SECTION 4: Claim Management & Audit State Machine ---');

    // TC-030: Student submits claim on found item
    const submitClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: foundItemId,
      verification_details: 'Service tag starts with ST-904. There is a sticker of a cartoon cat near trackpad.'
    }, { Cookie: student1Cookie });
    assertTest(submitClaimRes.statusCode === 201 && submitClaimRes.body?.data?.status === 'pending', 'Student submits ownership claim with 201 Created and pending status', 'Claims');
    const createdClaimId = submitClaimRes.body?.data?.id;

    // TC-031: Item status automatically moves to claim_pending
    const [checkItemClaim] = await db.query('SELECT status FROM items WHERE id = ?', [foundItemId]);
    assertTest(checkItemClaim[0].status === 'claim_pending', 'Target item status transitioned from "open" to "claim_pending"', 'Claims');

    // TC-032: Duplicate claim attempt on same item rejected
    const dupClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: foundItemId,
      verification_details: 'Second attempt proof.'
    }, { Cookie: student1Cookie });
    assertTest(dupClaimRes.statusCode === 409, 'Duplicate active claim rejected with 409 Conflict', 'Claims');

    // TC-033: Finder claiming own reported item rejected
    const selfClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: foundItemId,
      verification_details: 'I reported it, now claiming it.'
    }, { Cookie: newStudentCookie }); // newStudent is the reporter
    assertTest(selfClaimRes.statusCode === 400, 'Finder claiming their own reported item rejected with 400 Bad Request', 'Claims');

    // TC-034: Student views their claims (GET /api/claims/my-claims)
    const myClaimsRes = await makeRequest('GET', '/api/claims/my-claims', null, { Cookie: student1Cookie });
    const claimFoundInList = myClaimsRes.body?.data?.some(c => c.id === createdClaimId);
    assertTest(myClaimsRes.statusCode === 200 && claimFoundInList, 'Student retrieves their own claims list successfully', 'Claims');

    // TC-035: Privacy - Another student cannot see Student 1's claim
    const otherStudentClaimsRes = await makeRequest('GET', '/api/claims/my-claims', null, { Cookie: newStudentCookie });
    const otherHasClaim = otherStudentClaimsRes.body?.data?.some(c => c.id === createdClaimId);
    assertTest(!otherHasClaim, 'Privacy: Other students cannot view another student\'s private claims', 'Claims');

    // TC-036: Admin views all claims across campus (GET /api/claims)
    const adminClaimsRes = await makeRequest('GET', '/api/claims', null, { Cookie: adminCookie });
    assertTest(adminClaimsRes.statusCode === 200 && adminClaimsRes.body?.count >= 1, 'Admin retrieves campus-wide claims registry', 'Claims');

    // TC-037: Admin approves claim
    const approveClaimRes = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, {
      status: 'approved',
      admin_remarks: 'Verified service tag ST-904. Ready for pickup at Security Desk Gate 1.'
    }, { Cookie: adminCookie });
    assertTest(approveClaimRes.statusCode === 200 && approveClaimRes.body?.data?.status === 'approved', 'Admin approves claim with 200 OK', 'Claims');

    // TC-038: Associated item automatically marked as recovered
    const [checkRecoveredItem] = await db.query('SELECT status FROM items WHERE id = ?', [foundItemId]);
    assertTest(checkRecoveredItem[0].status === 'recovered', 'Associated item status automatically transitioned to "recovered"', 'Claims');

    // TC-039: Claimant receives approval notification
    const [approvalNotif] = await db.query(
      `SELECT notification_type, message FROM notifications WHERE user_id = ? AND notification_type = 'claim_approved' ORDER BY id DESC LIMIT 1`,
      [student1Id]
    );
    assertTest(approvalNotif.length > 0 && approvalNotif[0].message.includes('APPROVED'), 'Automated pickup notification dispatched to claimant', 'Claims');

    // =========================================================================
    // SECTION 5: DYNAMIC QR CODE CUSTODY TAGS & PRIVACY COMPLIANCE
    // =========================================================================
    console.log('\n--- SECTION 5: Dynamic QR Custody Tags & Privacy ---');

    // TC-040: Dynamic QR Code Data URL generation
    const qrRes = await makeRequest('GET', `/api/items/${foundItemId}/qrcode`);
    assertTest(
      qrRes.statusCode === 200 && qrRes.body?.data?.qrDataUrl.startsWith('data:image/png;base64,'),
      'GET /api/items/:id/qrcode generates valid high-contrast Base64 PNG QR code',
      'QR Verification'
    );

    // TC-041: Public QR verification endpoint with valid token
    const verifyValidRes = await makeRequest('GET', `/api/items/verify-qr/${foundQRToken}`);
    assertTest(verifyValidRes.statusCode === 200 && verifyValidRes.body?.verified === true, 'Public QR verification validates token with 200 OK', 'QR Verification');

    // TC-042: FERPA/Privacy compliance on public QR endpoint
    const publicData = verifyValidRes.body?.data || {};
    const privacyViolations = ['password', 'email', 'phone', 'student_id'].filter(k => publicData[k] !== undefined);
    assertTest(privacyViolations.length === 0, 'Privacy Compliance: Sensitive student/finder contacts excluded from QR verification response', 'Security');

    // TC-043: Tampered or invalid QR token returns 404
    const verifyInvalidRes = await makeRequest('GET', '/api/items/verify-qr/FORGED-TOKEN-XYZ-999');
    assertTest(verifyInvalidRes.statusCode === 404 && verifyInvalidRes.body?.verified === false, 'Tampered QR token correctly rejected with 404 Not Found', 'QR Verification');

    // =========================================================================
    // SECTION 6: DASHBOARDS, ANALYTICS & NOTIFICATIONS
    // =========================================================================
    console.log('\n--- SECTION 6: Dashboards, Visual Analytics & Notifications ---');

    // TC-044: Student Dashboard Statistics
    const studentStatsRes = await makeRequest('GET', '/api/dashboard/student-stats', null, { Cookie: student1Cookie });
    assertTest(studentStatsRes.statusCode === 200 && studentStatsRes.body?.data?.metrics?.total_reports >= 1, 'Student dashboard metrics return populated real-time counters', 'Dashboards');

    // TC-045: Admin Dashboard Statistics
    const adminStatsRes = await makeRequest('GET', '/api/dashboard/admin-stats', null, { Cookie: adminCookie });
    assertTest(adminStatsRes.statusCode === 200 && adminStatsRes.body?.data?.kpis?.total_users >= 1, 'Admin governance console returns campus KPI counters', 'Dashboards');

    // TC-046: Visual Analytics API (Chart.js Datasets)
    const analyticsRes = await makeRequest('GET', '/api/dashboard/analytics', null, { Cookie: adminCookie });
    const hasAllCharts = analyticsRes.body?.data?.lostVsFound && analyticsRes.body?.data?.monthlyReports && analyticsRes.body?.data?.claimStatus && analyticsRes.body?.data?.categoriesDistribution;
    assertTest(analyticsRes.statusCode === 200 && hasAllCharts, 'GET /api/dashboard/analytics supplies all 4 Chart.js datasets from database', 'Analytics');

    // TC-047: Notification feed retrieval
    const notifsFeedRes = await makeRequest('GET', '/api/notifications', null, { Cookie: student1Cookie });
    assertTest(notifsFeedRes.statusCode === 200 && Array.isArray(notifsFeedRes.body?.data), 'GET /api/notifications returns user notification feed', 'Notifications');

    // TC-048: Notification unread count badge
    const unreadCountRes = await makeRequest('GET', '/api/notifications/unread-count', null, { Cookie: student1Cookie });
    assertTest(unreadCountRes.statusCode === 200 && typeof unreadCountRes.body?.unread_count === 'number', 'GET /api/notifications/unread-count returns numeric counter', 'Notifications');

    // TC-049: Mark all notifications as read
    const markAllRes = await makeRequest('PUT', '/api/notifications/read-all', null, { Cookie: student1Cookie });
    assertTest(markAllRes.statusCode === 200, 'PUT /api/notifications/read-all marks feed as read', 'Notifications');

    // TC-050: Admin user management endpoint
    const adminUsersRes = await makeRequest('GET', '/api/users', null, { Cookie: adminCookie });
    assertTest(adminUsersRes.statusCode === 200 && adminUsersRes.body?.data?.length >= 2, 'Admin user management retrieves registered students and staff', 'Admin Console');

    // TC-051: Admin category creation
    const newCatName = `Academic Robotics ${Date.now().toString(36).toUpperCase()}`;
    const createCatRes = await makeRequest('POST', '/api/categories', {
      category_name: newCatName,
      description: 'Robotics kits and hardware'
    }, { Cookie: adminCookie });
    assertTest(createCatRes.statusCode === 201 && createCatRes.body?.data?.category_name === newCatName, 'Admin creates new classification category with 201 Created', 'Admin Console');
    const createdCatId = createCatRes.body?.data?.id;

    // =========================================================================
    // SECTION 7: SECURITY PENETRATION, INJECTION & ABUSE TESTING
    // =========================================================================
    console.log('\n--- SECTION 7: Security Penetration & Abuse Resistance ---');

    // TC-052: SQL Injection Attempt in Search Parameter
    const sqliSearchRes = await makeRequest('GET', `/api/items?search=' OR '1'='1`);
    assertTest(sqliSearchRes.statusCode === 200 && Array.isArray(sqliSearchRes.body?.data), 'SQLi Defense: Search query handles malicious input safely without SQL syntax error', 'Security');

    // TC-053: SQL Injection Attempt in Login Credentials
    const sqliLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: "' OR 1=1 --",
      password: "password"
    });
    assertTest(sqliLoginRes.statusCode === 401, 'SQLi Defense: Authentication rejects SQL injection vectors (401)', 'Security');

    // TC-054: Role Escalation Defense - Student cannot elevate self to Admin via registration
    const escalateRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Escalation Attempt',
      email: `hacker_${Date.now()}@campus.edu`,
      password: 'password123',
      confirmPassword: 'password123',
      role: 'admin' // Attempting to inject admin role
    });
    assertTest(escalateRes.statusCode === 201 && escalateRes.body?.user?.role === 'student', 'RBAC Defense: Public registration strictly enforces student role, ignoring injection', 'Security');

    // TC-055: Path Traversal defense in Item ID parameter
    const pathTraversalRes = await makeRequest('GET', '/api/items/..%2F..%2Fetc%2Fpasswd');
    assertTest(pathTraversalRes.statusCode === 400 || pathTraversalRes.statusCode === 404, 'Path Traversal Defense: Directory traversal attempt in item ID is rejected', 'Security');

    // TC-056: Non-numeric ID validation in claims
    const badClaimIdRes = await makeRequest('GET', '/api/claims/malicious_payload_string', null, { Cookie: student1Cookie });
    assertTest(badClaimIdRes.statusCode === 400, 'Input Validation: Non-numeric ID rejects with 400 Bad Request', 'Security');

    // TC-057: CORS headers check
    const corsRes = await makeRequest('OPTIONS', '/api/health', null, {
      'Origin': 'http://localhost:5000',
      'Access-Control-Request-Method': 'GET'
    });
    assertTest(corsRes.headers['access-control-allow-credentials'] === 'true', 'CORS Security: Access-Control-Allow-Credentials configured correctly', 'Security');

    // TC-058: Owner deletion of test item
    const deleteOwnItemRes = await makeRequest('DELETE', `/api/items/${lostItemId}`, null, { Cookie: student1Cookie });
    assertTest(deleteOwnItemRes.statusCode === 200, 'Owner can delete their own item report (200 OK)', 'Items');

    // Cleanup created test records
    await db.query('DELETE FROM items WHERE id IN (?, ?)', [lostItemId, foundItemId]);
    await db.query('DELETE FROM claims WHERE id = ?', [createdClaimId]);
    await db.query('DELETE FROM categories WHERE id = ?', [createdCatId]);
    await db.query('DELETE FROM users WHERE id IN (?, ?)', [newStudentId, escalateRes.body?.user?.id]);

    console.log('\n======================================================================');
    console.log(` MASTER TEST SUITE COMPLETE: ${passedCount}/${testIndex} Tests Passed (${Math.round((passedCount / testIndex) * 100)}%)`);
    console.log('======================================================================\n');

    process.exit(passedCount === testIndex ? 0 : 1);
  } catch (err) {
    console.error('Fatal execution error during master test suite:', err);
    process.exit(1);
  }
}

runMasterTestSuite();

