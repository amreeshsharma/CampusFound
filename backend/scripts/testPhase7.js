/**
 * CampusFind 2.0 - Phase 7 Automated Test Suite
 * Claim Management and QR Code Custody Verification Testing
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

async function runPhase7Tests() {
  console.log('====================================================');
  console.log(' CampusFind 2.0 - Phase 7 Test Suite');
  console.log(' Claim Management & QR Custody Verification');
  console.log('====================================================\n');

  try {
    // 1. Authentication setup for test actors
    console.log('--- Step 1: Authenticate Test Actors ---');

    // Student 1: Rahul Sharma (student@campus.edu)
    const loginResStudent1 = await makeRequest('POST', '/api/auth/login', {
      email: 'student@campus.edu',
      password: 'student123'
    });
    const student1Cookie = parseAuthCookie(loginResStudent1.cookies);
    const student1Id = loginResStudent1.body?.user?.id;
    assert(loginResStudent1.statusCode === 200 && student1Cookie && student1Id, 'Student 1 logs in successfully');

    // Student 2: Ananya Patel (ananya@campus.edu)
    const loginResStudent2 = await makeRequest('POST', '/api/auth/login', {
      email: 'ananya@campus.edu',
      password: 'student123'
    });
    const student2Cookie = parseAuthCookie(loginResStudent2.cookies);
    const student2Id = loginResStudent2.body?.user?.id;
    assert(loginResStudent2.statusCode === 200 && student2Cookie && student2Id, 'Student 2 logs in successfully');

    // Admin: Campus Security Admin (admin@campusfind.edu)
    const loginResAdmin = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@campusfind.edu',
      password: 'admin123'
    });
    const adminCookie = parseAuthCookie(loginResAdmin.cookies);
    assert(loginResAdmin.statusCode === 200 && adminCookie, 'Admin logs in successfully');

    // 2. Setup Test Data in MySQL
    console.log('\n--- Step 2: Prepare Target Found Items in MySQL ---');
    // Ensure we have a found item reported by Student 2 with a QR token
    const testQRToken = `QR-FND-PHASE7-${Date.now().toString(36).toUpperCase()}`;
    const [catRows] = await db.query('SELECT id FROM categories LIMIT 1');
    const catId = catRows[0].id;

    const [itemInsertRes] = await db.query(
      `INSERT INTO items (user_id, category_id, title, description, item_type, color, location, item_date, status, qr_token)
       VALUES (?, ?, 'Silver Apple MacBook Pro 14', 'Found on study desk 3B. Space gray stickers.', 'found', 'Silver', 'Central Library 2nd Floor', CURDATE(), 'open', ?)`,
      [student2Id, catId, testQRToken]
    );
    const targetItemId = itemInsertRes.insertId;
    assert(targetItemId > 0, `Target found item created (ID: ${targetItemId}, QR: ${testQRToken})`);

    // Create a lost item for negative validation
    const [lostItemRes] = await db.query(
      `INSERT INTO items (user_id, category_id, title, description, item_type, color, location, item_date, status)
       VALUES (?, ?, 'Lost Car Keys with Blue Lanyard', 'Keys lost in parking.', 'lost', 'Blue', 'East Parking', CURDATE(), 'open')`,
      [student1Id, catId]
    );
    const lostItemId = lostItemRes.insertId;

    // 3. Claim Validation & Anti-Abuse Rules
    console.log('\n--- Step 3: Test Validation & Anti-Abuse Rules ---');

    // Test: Unauthenticated claim submission
    const unauthClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: targetItemId,
      verification_details: 'I left it there.'
    });
    assert(unauthClaimRes.statusCode === 401, 'Unauthenticated claim rejected with 401 Unauthorized');

    // Test: Missing verification details
    const emptyDetailsRes = await makeRequest('POST', '/api/claims', {
      item_id: targetItemId,
      verification_details: '   '
    }, { Cookie: student1Cookie });
    assert(emptyDetailsRes.statusCode === 400, 'Claim with empty verification details rejected with 400 Bad Request');

    // Test: Claim on a lost item (only found items can be claimed)
    const claimOnLostRes = await makeRequest('POST', '/api/claims', {
      item_id: lostItemId,
      verification_details: 'This is my lost keys.'
    }, { Cookie: student1Cookie });
    assert(claimOnLostRes.statusCode === 400, 'Claim on a "lost" item rejected with 400 Bad Request');

    // Test: Claim on non-existent item
    const notFoundItemRes = await makeRequest('POST', '/api/claims', {
      item_id: 999999,
      verification_details: 'Imaginary item proof.'
    }, { Cookie: student1Cookie });
    assert(notFoundItemRes.statusCode === 404, 'Claim on non-existent item rejected with 404 Not Found');

    // Test: Finder claiming their own reported found item
    const selfClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: targetItemId,
      verification_details: 'I reported finding it, now I claim it.'
    }, { Cookie: student2Cookie }); // student2 is the reporter
    assert(selfClaimRes.statusCode === 400, 'Reporter claiming own found item rejected with 400 Bad Request');

    // 4. Valid Claim Submission Workflow
    console.log('\n--- Step 4: Valid Claim Submission & Item State Transition ---');

    const validClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: targetItemId,
      verification_details: 'Laptop has a small scratch next to the HDMI port and a sticker of Linux Tux on bottom.'
    }, { Cookie: student1Cookie });

    assert(validClaimRes.statusCode === 201, 'Valid claim submitted with 201 Created');
    const claim1Id = validClaimRes.body?.data?.id;
    assert(claim1Id > 0 && validClaimRes.body?.data?.status === 'pending', 'Claim assigned ID and status is "pending"');

    // Check item status transitioned to 'claim_pending' in MySQL
    const [itemCheck] = await db.query('SELECT status FROM items WHERE id = ?', [targetItemId]);
    assert(itemCheck[0].status === 'claim_pending', 'Target item status transitioned from "open" to "claim_pending"');

    // Check notification was dispatched to student 1
    const [notifCheck] = await db.query(
      'SELECT message, notification_type FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [student1Id]
    );
    assert(
      notifCheck.length > 0 && notifCheck[0].notification_type === 'claim_submitted',
      'Confirmation notification logged for claimant'
    );

    // Test: Duplicate claim attempt by the same student
    const duplicateClaimRes = await makeRequest('POST', '/api/claims', {
      item_id: targetItemId,
      verification_details: 'Second attempt submitting proof.'
    }, { Cookie: student1Cookie });
    assert(duplicateClaimRes.statusCode === 409, 'Duplicate active claim rejected with 409 Conflict');

    // 5. Access Control & Student Claim Retrieval
    console.log('\n--- Step 5: Role-Based Authorization on Claims ---');

    // Student 1 views their own claims
    const student1ClaimsRes = await makeRequest('GET', '/api/claims/my-claims', null, { Cookie: student1Cookie });
    assert(
      student1ClaimsRes.statusCode === 200 && Array.isArray(student1ClaimsRes.body?.data),
      'Student can retrieve their own claims list'
    );
    const hasTargetClaim = student1ClaimsRes.body.data.some(c => c.id === claim1Id);
    assert(hasTargetClaim, 'Newly submitted claim is present in Student 1 my-claims list');

    // Student 2 views their claims (should NOT include student 1\'s claim)
    const student2ClaimsRes = await makeRequest('GET', '/api/claims/my-claims', null, { Cookie: student2Cookie });
    const student2HasClaim1 = student2ClaimsRes.body?.data?.some(c => c.id === claim1Id);
    assert(!student2HasClaim1, 'Student 2 does NOT see Student 1\'s private claim');

    // Student attempts to view all claims across campus (forbidden)
    const studentAllClaimsRes = await makeRequest('GET', '/api/claims', null, { Cookie: student1Cookie });
    assert(studentAllClaimsRes.statusCode === 403, 'Student access to GET /api/claims is forbidden (403)');

    // Student attempts to audit / approve a claim (forbidden)
    const studentAuditRes = await makeRequest('PUT', `/api/claims/${claim1Id}/status`, {
      status: 'approved',
      admin_remarks: 'Self approval attempt'
    }, { Cookie: student1Cookie });
    assert(studentAuditRes.statusCode === 403, 'Student access to PUT /api/claims/:id/status is forbidden (403)');

    // 6. Admin Claim Auditing & Handover Workflow
    console.log('\n--- Step 6: Admin Claim Audit & Item Recovery Workflow ---');

    // Admin views all claims
    const adminAllClaimsRes = await makeRequest('GET', '/api/claims', null, { Cookie: adminCookie });
    assert(
      adminAllClaimsRes.statusCode === 200 && adminAllClaimsRes.body?.count >= 1,
      'Admin successfully retrieves all campus claims'
    );

    // Admin approves claim with pickup remarks
    const approvalRes = await makeRequest('PUT', `/api/claims/${claim1Id}/status`, {
      status: 'approved',
      admin_remarks: 'Serial number SN-MBP-901 and Tux sticker verified. Ready for pickup at Security Desk Gate 1.'
    }, { Cookie: adminCookie });

    assert(approvalRes.statusCode === 200, 'Admin approves claim with 200 OK');
    assert(approvalRes.body?.data?.status === 'approved', 'Claim status updated to "approved"');

    // Verify item is now 'recovered' in MySQL
    const [recoveredItemCheck] = await db.query('SELECT status FROM items WHERE id = ?', [targetItemId]);
    assert(recoveredItemCheck[0].status === 'recovered', 'Associated item status automatically updated to "recovered"');

    // Verify approval notification delivered to student
    const [approvalNotif] = await db.query(
      `SELECT notification_type, message FROM notifications 
       WHERE user_id = ? AND notification_type = 'claim_approved' 
       ORDER BY id DESC LIMIT 1`,
      [student1Id]
    );
    assert(approvalNotif.length > 0, 'Approval and pickup notification delivered to claimant');

    // 7. QR Code Generation & Safe Verification Endpoint
    console.log('\n--- Step 7: QR Code Generation & Verification ---');

    // Fetch dynamic QR code data for the item
    const qrRes = await makeRequest('GET', `/api/items/${targetItemId}/qrcode`);
    assert(qrRes.statusCode === 200, 'GET /api/items/:id/qrcode returns 200 OK');
    assert(
      qrRes.body?.data?.qrDataUrl && qrRes.body.data.qrDataUrl.startsWith('data:image/png;base64,'),
      'QR endpoint generated valid PNG Base64 Data URL'
    );
    assert(
      qrRes.body?.data?.verificationUrl && qrRes.body.data.verificationUrl.includes(testQRToken),
      'Verification URL correctly embeds item QR token'
    );

    // Public QR Verification Endpoint (GET /api/items/verify-qr/:token)
    const verifyValidRes = await makeRequest('GET', `/api/items/verify-qr/${testQRToken}`);
    assert(verifyValidRes.statusCode === 200 && verifyValidRes.body?.verified === true, 'Valid QR token verifies successfully (200 OK)');
    assert(verifyValidRes.body?.data?.title === 'Silver Apple MacBook Pro 14', 'Public verification returns correct item title');

    // Privacy Check: Ensure sensitive owner/finder personal contact details are NOT leaked
    const responseKeys = Object.keys(verifyValidRes.body?.data || {});
    const leaksSensitive = responseKeys.includes('email') || responseKeys.includes('phone') || responseKeys.includes('password');
    assert(!leaksSensitive, 'FERPA/Privacy Check: No email, phone, or credentials exposed via public QR endpoint');

    // Invalid QR token check
    const verifyInvalidRes = await makeRequest('GET', '/api/items/verify-qr/QR-INVALID-9999-FAKE');
    assert(verifyInvalidRes.statusCode === 404, 'Invalid QR token correctly returns 404 Not Found');

    // Clean up temporary test items
    await db.query('DELETE FROM notifications WHERE user_id IN (?, ?)', [student1Id, student2Id]);
    await db.query('DELETE FROM claims WHERE item_id IN (?, ?)', [targetItemId, lostItemId]);
    await db.query('DELETE FROM items WHERE id IN (?, ?)', [targetItemId, lostItemId]);

    console.log('\n====================================================');
    console.log(` PHASE 7 TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('====================================================');

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    console.error('Fatal test execution error:', error);
    process.exit(1);
  }
}

runPhase7Tests();
