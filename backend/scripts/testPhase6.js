/**
 * CampusFind 2.0 - Phase 6 Smart Matching System Test Suite
 * Tests exact matches, partial matches, category/color filtering, recovered item exclusion, and API endpoints
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  calculateMatchScore,
  findMatchesForItem,
  findMatchesForUser
} = require('../services/matchingService');

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
  console.log(' CampusFind 2.0: Running Phase 6 Smart Matching Tests   ');
  console.log('========================================================\n');

  // Test 1: Unit Test - Exact Match Calculation
  console.log('Test 1: Unit Test - Exact Match (Same category, keywords, color, location, date)');
  const itemA = {
    title: 'Casio Scientific Calculator fx-991EX',
    category_id: 1,
    category_name: 'Electronics & Gadgets',
    color: 'Black',
    location: 'Mechanical Lab 3',
    item_date: '2026-10-29',
    description: 'Black calculator with silver sticker'
  };

  const itemB = {
    title: 'Casio fx-991EX Classwiz Calculator',
    category_id: 1,
    category_name: 'Electronics & Gadgets',
    color: 'Black',
    location: 'Mechanical Lab 3',
    item_date: '2026-10-30',
    description: 'Found black calculator in lab 3'
  };

  const exactRes = calculateMatchScore(itemA, itemB);
  assert(exactRes.score >= 90, `Exact match score is >= 90% (Calculated: ${exactRes.score}%)`);
  assert(exactRes.reasons.length >= 4, `Explainability has ${exactRes.reasons.length} matching reasons`);

  // Test 2: Unit Test - Different Categories (Category weight 30% lost)
  console.log('\nTest 2: Unit Test - Different Categories');
  const itemDiffCat = { ...itemB, category_id: 4, category_name: 'Bottles & Containers' };
  const diffCatRes = calculateMatchScore(itemA, itemDiffCat);
  assert(diffCatRes.breakdown.category === 0, 'Category score is 0% for different categories');
  assert(diffCatRes.score <= 70, `Score drops proportionally (Calculated: ${diffCatRes.score}%)`);

  // Test 3: Unit Test - Different Colors (Color weight 15% lost)
  console.log('\nTest 3: Unit Test - Different Colors');
  const itemDiffColor = { ...itemB, color: 'Bright Red' };
  const diffColorRes = calculateMatchScore(itemA, itemDiffColor);
  assert(diffColorRes.breakdown.color === 0, 'Color score is 0% when colors mismatch');

  // Test 4: Unit Test - Missing Fields Handling
  console.log('\nTest 4: Unit Test - Missing / Incomplete Fields Graceful Handling');
  const itemIncomplete = {
    title: '',
    category_id: null,
    color: '',
    location: '',
    item_date: null,
    description: ''
  };
  const incompleteRes = calculateMatchScore(itemA, itemIncomplete);
  assert(incompleteRes.score === 0, 'Missing fields correctly score 0% without crashing');
  assert(incompleteRes.reasons.length === 0, 'No false positive reasons generated for missing data');

  // Test 5: Integration - Recovered Items Excluded from Match Pool
  console.log('\nTest 5: Integration - Exclude Recovered Belongings');
  // Item #6 in seed data is 'recovered' (Noise Cancelling Earbuds)
  const recoveredMatches = await findMatchesForItem(6);
  assert(recoveredMatches.length === 0, 'Recovered item returns 0 candidate matches (archived)');

  // Test 6: Integration - Item Matching for Seed Item #1 (Lost Casio Calculator)
  console.log('\nTest 6: Integration - findMatchesForItem(1) against MySQL');
  const matchesFor1 = await findMatchesForItem(1, 40);
  assert(matchesFor1.length > 0, 'Finds at least 1 match candidate above 40% threshold');
  assert(matchesFor1[0].matchedItem.id === 2, `Top match is Item #2: "${matchesFor1[0].matchedItem.title}"`);
  assert(matchesFor1[0].matchPercentage >= 90, `Top match percentage: ${matchesFor1[0].matchPercentage}%`);

  // Test 7: Integration - User Smart Matches for Student 1 (Rahul Sharma)
  console.log('\nTest 7: Integration - findMatchesForUser(1) against MySQL');
  const userMatches = await findMatchesForUser(1, 40);
  assert(userMatches.length > 0, `Student #1 has ${userMatches.length} proactive smart match suggestion(s)`);
  assert(userMatches[0].isPossibleMatch === true, 'Explicitly marked as isPossibleMatch: true');

  // Test 8: Deduplication Check
  console.log('\nTest 8: Deduplication Check');
  const pairKeys = userMatches.map(m => `${m.myLostItem.id}-${m.foundItem.id}`);
  const uniqueKeys = new Set(pairKeys);
  assert(pairKeys.length === uniqueKeys.size, 'No duplicate match pairings returned for user');

  // Test 9: REST API - GET /api/items/:id/matches
  console.log('\nTest 9: REST API - GET /api/items/1/matches');
  const apiItemMatchRes = await fetch(`${API_BASE}/items/1/matches`);
  const apiItemMatchData = await apiItemMatchRes.json();
  assert(apiItemMatchRes.status === 200, 'API status 200 OK');
  assert(apiItemMatchData.success === true, 'API response success true');
  assert(apiItemMatchData.count >= 1, `API returns ${apiItemMatchData.count} match(es)`);

  // Test 10: REST API - GET /api/matches/my-matches (Protected)
  console.log('\nTest 10: REST API - GET /api/matches/my-matches (Authenticated)');
  // Authenticate as Student 1
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@campus.edu', password: 'student123' })
  });
  const loginData = await loginRes.json();

  const myMatchesRes = await fetch(`${API_BASE}/matches/my-matches`, {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const myMatchesData = await myMatchesRes.json();
  assert(myMatchesRes.status === 200, 'Authenticated matches API status 200 OK');
  assert(myMatchesData.success === true, 'Response success is true');
  assert(Array.isArray(myMatchesData.data), 'Data is an array of matches');

  console.log('\n========================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
