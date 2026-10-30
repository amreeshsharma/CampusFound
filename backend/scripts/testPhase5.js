/**
 * CampusFind 2.0 - Phase 5 Lost & Found Management Test Suite
 * Tests item creation, Multer uploads, QR token generation, search, filters, edits, deletes, and authorization guards
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

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
  console.log(' CampusFind 2.0: Running Phase 5 Item Management Tests  ');
  console.log('========================================================\n');

  // 1. Authenticate two students for ownership checks
  console.log('Step 1: Authenticate Student 1 (Rahul) & Student 2 (Ananya)');
  const login1 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@campus.edu', password: 'student123' })
  });
  const data1 = await login1.json();
  const tokenStudent1 = data1.token;

  const login2 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ananya@campus.edu', password: 'student123' })
  });
  const data2 = await login2.json();
  const tokenStudent2 = data2.token;

  assert(Boolean(tokenStudent1) && Boolean(tokenStudent2), 'Obtained authentication tokens for both test students');

  // 2. Report Lost Item (Student 1) with Multer Image Upload
  console.log('\nTest 1: Report Lost Item with Multer Image Upload');
  const dummyImagePath = path.join(__dirname, 'dummy-test-image.png');
  // Create a minimal 1x1 PNG dummy file for upload testing
  const dummyPngBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');
  fs.writeFileSync(dummyImagePath, dummyPngBuffer);

  const formData = new FormData();
  formData.append('title', 'Titan Smartwatch Model 99');
  formData.append('category_id', '1');
  formData.append('item_type', 'lost');
  formData.append('color', 'Midnight Black');
  formData.append('location', 'Badminton Court 1');
  formData.append('item_date', '2026-10-30');
  formData.append('description', 'Black silicone strap with scratch on screen bezel.');
  const fileBlob = new Blob([dummyPngBuffer], { type: 'image/png' });
  formData.append('image', fileBlob, 'titan-watch.png');

  const createLostRes = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenStudent1}` },
    body: formData
  });
  const createLostData = await createLostRes.json();

  assert(createLostRes.status === 201, 'Status is 201 Created', `Got ${createLostRes.status}`);
  assert(createLostData.success === true, 'Response success is true');
  assert(createLostData.data.item_type === 'lost', 'Item type is lost');
  assert(Boolean(createLostData.data.image_path), 'Image path stored in MySQL', createLostData.data.image_path);
  const createdItemId = createLostData.data.id;

  // 3. Report Found Item with Auto QR Generation
  console.log('\nTest 2: Report Found Item & Verify Unique QR Token Generation');
  const foundFormData = new FormData();
  foundFormData.append('title', 'Leather Wallet with Metro Card');
  foundFormData.append('category_id', '3');
  foundFormData.append('item_type', 'found');
  foundFormData.append('color', 'Brown');
  foundFormData.append('location', 'Cafeteria Table 5');
  foundFormData.append('item_date', '2026-10-31');
  foundFormData.append('description', 'Brown leather wallet. Has student metro pass.');

  const createFoundRes = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenStudent1}` },
    body: foundFormData
  });
  const createFoundData = await createFoundRes.json();

  assert(createFoundRes.status === 201, 'Status is 201 Created for Found Item');
  assert(Boolean(createFoundData.data.qr_token), 'Unique QR Token automatically generated', createFoundData.data.qr_token);
  assert(createFoundData.data.qr_token.startsWith('QR-FND-'), 'QR token follows standard pattern QR-FND-*');

  // 4. Search by Item Name / Keyword
  console.log('\nTest 3: Search by Keyword across title & description');
  const searchRes = await fetch(`${API_BASE}/items?search=Smartwatch`);
  const searchData = await searchRes.json();
  assert(searchRes.status === 200, 'Search status 200 OK');
  assert(searchData.count >= 1, 'Search finds Titan Smartwatch', `Count: ${searchData.count}`);
  assert(searchData.data.some(i => i.title.includes('Titan Smartwatch')), 'Target item in search results');

  // 5. Backend SQL Multi-filtering
  console.log('\nTest 4: Multi-filter by category, color, location, and type');
  const filterRes = await fetch(`${API_BASE}/items?type=lost&color=Black`);
  const filterData = await filterRes.json();
  assert(filterRes.status === 200, 'Filter status 200 OK');
  assert(filterData.data.every(i => i.item_type === 'lost' && i.color.includes('Black')), 'All filtered results match type=lost and color=Black');

  // 6. Edit Item: Unauthorized Edit Attempt (Student 2 trying to edit Student 1's item)
  console.log('\nTest 5: Unauthorized Edit Attempt (RBAC Protection)');
  const unauthEditRes = await fetch(`${API_BASE}/items/${createdItemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenStudent2}` // Student 2 is NOT the owner
    },
    body: JSON.stringify({ location: 'Hostel Block A' })
  });
  const unauthEditData = await unauthEditRes.json();
  assert(unauthEditRes.status === 403, 'Unauthorized edit returns 403 Forbidden', `Got ${unauthEditRes.status}`);
  assert(unauthEditData.success === false, 'Blocked with message: ' + unauthEditData.message);

  // 7. Edit Item: Authorized Owner Edit (Student 1 editing their own item)
  console.log('\nTest 6: Authorized Owner Edit');
  const authEditRes = await fetch(`${API_BASE}/items/${createdItemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenStudent1}`
    },
    body: JSON.stringify({ location: 'Badminton Court 2, Near Bleachers', color: 'Jet Black' })
  });
  const authEditData = await authEditRes.json();
  assert(authEditRes.status === 200, 'Status 200 OK for owner edit');
  assert(authEditData.data.location === 'Badminton Court 2, Near Bleachers', 'Location updated in MySQL');
  assert(authEditData.data.color === 'Jet Black', 'Color updated in MySQL');

  // 8. Delete Item: Unauthorized Delete Attempt (Student 2 trying to delete Student 1's item)
  console.log('\nTest 7: Unauthorized Delete Attempt (RBAC Protection)');
  const unauthDeleteRes = await fetch(`${API_BASE}/items/${createdItemId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenStudent2}` } // Student 2 is NOT the owner
  });
  assert(unauthDeleteRes.status === 403, 'Unauthorized delete returns 403 Forbidden', `Got ${unauthDeleteRes.status}`);

  // 9. Delete Item: Authorized Owner Delete
  console.log('\nTest 8: Authorized Owner Delete');
  const authDeleteRes = await fetch(`${API_BASE}/items/${createdItemId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenStudent1}` }
  });
  const authDeleteData = await authDeleteRes.json();
  assert(authDeleteRes.status === 200, 'Status 200 OK for owner delete');
  assert(authDeleteData.success === true, 'Delete successful');

  // Verify item is no longer in database
  const getDeletedRes = await fetch(`${API_BASE}/items/${createdItemId}`);
  assert(getDeletedRes.status === 404, 'Deleted item verified non-existent (404 Not Found)');

  // Clean up test file
  if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);

  console.log('\n========================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

