/**
 * CampusFind - Rule-Based Smart Item Matching Engine
 * Compares Lost and Found belongings based on weighted heuristic criteria.
 * 
 * Configurable Weights (Total 100%):
 * - Category: 30%
 * - Item Name and Keywords: 25%
 * - Color: 15%
 * - Location: 20%
 * - Date Proximity: 10%
 * 
 * NOTE: This is a deterministic rule-based algorithm designed for transparent,
 * explainable campus matching (NO opaque ML / AI models).
 */

const { db } = require('../config/db');

// Configurable Rule Weights
const WEIGHTS = {
  CATEGORY: 30,
  KEYWORDS: 25,
  COLOR: 15,
  LOCATION: 20,
  DATE: 10
};

// Common English Stop Words for Text Normalization
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'with', 'for', 'to',
  'is', 'it', 'by', 'as', 'has', 'near', 'under', 'beside', 'from', 'my'
]);

/**
 * Normalizes text: lowercase, removes punctuation, trims, strips stop words
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Extracts meaningful keyword tokens from a string
 */
function extractTokens(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * 1. Category Similarity (Weight: 30%)
 */
function compareCategories(item1, item2) {
  if (!item1.category_id || !item2.category_id) {
    // If category IDs are missing, fallback to category name text comparison
    if (item1.category_name && item2.category_name &&
        normalizeText(item1.category_name) === normalizeText(item2.category_name)) {
      return {
        score: WEIGHTS.CATEGORY,
        reason: 'Identical Item Category (+30%)',
        matched: true
      };
    }
    return {
      score: 0,
      reason: 'Category information unavailable or mismatch (0%)',
      matched: false
    };
  }

  if (item1.category_id === item2.category_id) {
    return {
      score: WEIGHTS.CATEGORY,
      reason: `Identical Category: ${item1.category_name || 'Category Match'} (+30%)`,
      matched: true
    };
  }

  return {
    score: 0,
    reason: 'Different Item Categories (0%)',
    matched: false
  };
}

/**
 * 2. Item Name & Keywords Similarity (Weight: 25%)
 * Calculates word overlap / Jaccard similarity across titles and descriptions
 */
function compareKeywords(item1, item2) {
  const tokens1 = new Set([
    ...extractTokens(item1.title),
    ...extractTokens(item1.description)
  ]);

  const tokens2 = new Set([
    ...extractTokens(item2.title),
    ...extractTokens(item2.description)
  ]);

  if (tokens1.size === 0 || tokens2.size === 0) {
    return {
      score: 0,
      reason: 'Insufficient title or description keywords (0%)',
      matched: false
    };
  }

  // Find intersection of tokens
  const commonTokens = [...tokens1].filter(t => tokens2.has(t));
  const unionTokens = new Set([...tokens1, ...tokens2]);

  // Jaccard similarity coefficient: |A ∩ B| / |A ∪ B|
  const jaccard = commonTokens.length / unionTokens.size;

  // Title exact match bonus check
  const title1Norm = normalizeText(item1.title);
  const title2Norm = normalizeText(item2.title);
  const hasExactTitleMatch = title1Norm.length > 3 && (title1Norm.includes(title2Norm) || title2Norm.includes(title1Norm));

  let score = 0;
  if (hasExactTitleMatch) {
    score = WEIGHTS.KEYWORDS; // Full 25% for high title alignment
  } else {
    // Scale Jaccard similarity: overlap ratio of 0.3+ already represents high similarity for short descriptions
    const scaledRatio = Math.min(jaccard * 2.5, 1);
    score = Math.round(scaledRatio * WEIGHTS.KEYWORDS);
  }

  if (score > 0) {
    const previewWords = commonTokens.slice(0, 3).join(', ');
    return {
      score,
      reason: `Matching Keywords: "${previewWords}" (+${score}%)`,
      matched: true
    };
  }

  return {
    score: 0,
    reason: 'No common title or description keywords found (0%)',
    matched: false
  };
}

/**
 * 3. Color Similarity (Weight: 15%)
 */
function compareColors(item1, item2) {
  const color1Tokens = extractTokens(item1.color);
  const color2Tokens = extractTokens(item2.color);

  if (color1Tokens.length === 0 || color2Tokens.length === 0) {
    return {
      score: 0,
      reason: 'Color details not specified (0%)',
      matched: false
    };
  }

  const commonColors = color1Tokens.filter(c => color2Tokens.includes(c));

  if (commonColors.length > 0) {
    return {
      score: WEIGHTS.COLOR,
      reason: `Color Alignment: "${commonColors.join(', ')}" (+15%)`,
      matched: true
    };
  }

  return {
    score: 0,
    reason: 'Color mismatch (0%)',
    matched: false
  };
}

/**
 * 4. Campus Location Similarity (Weight: 20%)
 */
function compareLocations(item1, item2) {
  const loc1Tokens = extractTokens(item1.location);
  const loc2Tokens = extractTokens(item2.location);

  if (loc1Tokens.length === 0 || loc2Tokens.length === 0) {
    return {
      score: 0,
      reason: 'Location details incomplete (0%)',
      matched: false
    };
  }

  const commonLocs = loc1Tokens.filter(l => loc2Tokens.includes(l));

  if (commonLocs.length > 0) {
    // High location alignment
    const score = commonLocs.length >= 2 ? WEIGHTS.LOCATION : Math.round(WEIGHTS.LOCATION * 0.75);
    return {
      score,
      reason: `Campus Location Match: "${commonLocs.join(', ')}" (+${score}%)`,
      matched: true
    };
  }

  return {
    score: 0,
    reason: 'Reported in different campus areas (0%)',
    matched: false
  };
}

/**
 * 5. Date Proximity Similarity (Weight: 10%)
 * Belongings found within days of loss score highest
 */
function compareDateProximity(date1Str, date2Str) {
  if (!date1Str || !date2Str) {
    return {
      score: 0,
      reason: 'Report dates incomplete (0%)',
      matched: false
    };
  }

  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return { score: 0, reason: 'Invalid date format (0%)', matched: false };
  }

  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 2) {
    return {
      score: WEIGHTS.DATE,
      reason: `Incident dates within 48 hours (${diffDays}d apart) (+10%)`,
      matched: true
    };
  } else if (diffDays <= 5) {
    return {
      score: 7,
      reason: `Incident dates within 5 days (${diffDays}d apart) (+7%)`,
      matched: true
    };
  } else if (diffDays <= 10) {
    return {
      score: 4,
      reason: `Incident dates within 10 days (${diffDays}d apart) (+4%)`,
      matched: true
    };
  }

  return {
    score: 0,
    reason: `Reported more than 10 days apart (${diffDays}d) (0%)`,
    matched: false
  };
}

/**
 * Calculates overall match score and explainable reasons breakdown
 */
function calculateMatchScore(lostItem, foundItem) {
  const catMatch = compareCategories(lostItem, foundItem);
  const kwMatch = compareKeywords(lostItem, foundItem);
  const colMatch = compareColors(lostItem, foundItem);
  const locMatch = compareLocations(lostItem, foundItem);
  const dateMatch = compareDateProximity(lostItem.item_date, foundItem.item_date);

  const totalScore = catMatch.score + kwMatch.score + colMatch.score + locMatch.score + dateMatch.score;

  // Compile list of reasons
  const reasons = [catMatch, kwMatch, colMatch, locMatch, dateMatch]
    .filter(r => r.matched)
    .map(r => r.reason);

  return {
    score: Math.min(Math.max(totalScore, 0), 100),
    breakdown: {
      category: catMatch.score,
      keywords: kwMatch.score,
      color: colMatch.score,
      location: locMatch.score,
      date: dateMatch.score
    },
    reasons
  };
}

/**
 * Find smart matches for a specific item against opposite catalog
 * @param {number} itemId - Target item ID
 * @param {number} threshold - Minimum score percentage (default: 40%)
 */
async function findMatchesForItem(itemId, threshold = 40) {
  // 1. Fetch target item
  const [targetRows] = await db.query(
    `SELECT i.*, c.category_name 
     FROM items i 
     LEFT JOIN categories c ON i.category_id = c.id 
     WHERE i.id = ?`,
    [itemId]
  );

  if (!targetRows || targetRows.length === 0) {
    return [];
  }

  const targetItem = targetRows[0];

  // If target item is already recovered or closed, do not match
  if (targetItem.status === 'recovered' || targetItem.status === 'closed') {
    return [];
  }

  // Determine opposite catalog type: lost -> search found; found -> search lost
  const oppositeType = targetItem.item_type === 'lost' ? 'found' : 'lost';

  // 2. Fetch candidate items: opposite type, not recovered/closed, not self
  const [candidates] = await db.query(
    `SELECT i.*, c.category_name, u.name AS reporter_name 
     FROM items i 
     LEFT JOIN categories c ON i.category_id = c.id 
     LEFT JOIN users u ON i.user_id = u.id 
     WHERE i.item_type = ? 
       AND i.id != ? 
       AND i.status NOT IN ('recovered', 'closed')
     ORDER BY i.created_at DESC`,
    [oppositeType, itemId]
  );

  // 3. Compute scores and filter above threshold
  const matches = [];

  for (const candidate of candidates) {
    // If target is lost, compare (target, candidate); if target is found, compare (candidate, target)
    const lostItem = targetItem.item_type === 'lost' ? targetItem : candidate;
    const foundItem = targetItem.item_type === 'found' ? targetItem : candidate;

    const matchResult = calculateMatchScore(lostItem, foundItem);

    if (matchResult.score >= threshold) {
      matches.push({
        matchedItem: candidate,
        matchPercentage: matchResult.score,
        breakdown: matchResult.breakdown,
        matchingReasons: matchResult.reasons,
        isPossibleMatch: true
      });
    }
  }

  // Sort descending by highest match score
  matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return matches;
}

/**
 * Find all match suggestions across all active lost items reported by a student
 * @param {number} userId - Student ID
 * @param {number} threshold - Score threshold (default: 40%)
 */
async function findMatchesForUser(userId, threshold = 40) {
  // 1. Fetch user's active lost items
  const [userLostItems] = await db.query(
    `SELECT i.*, c.category_name 
     FROM items i 
     LEFT JOIN categories c ON i.category_id = c.id 
     WHERE i.user_id = ? 
       AND i.item_type = 'lost' 
       AND i.status IN ('open', 'claim_pending')`,
    [userId]
  );

  if (!userLostItems || userLostItems.length === 0) {
    return [];
  }

  // 2. Fetch all candidate found items
  const [candidateFoundItems] = await db.query(
    `SELECT i.*, c.category_name, u.name AS reporter_name 
     FROM items i 
     LEFT JOIN categories c ON i.category_id = c.id 
     LEFT JOIN users u ON i.user_id = u.id 
     WHERE i.item_type = 'found' 
       AND i.status IN ('open', 'claim_pending')
     ORDER BY i.created_at DESC`
  );

  const userMatches = [];
  const seenPairings = new Set(); // Prevent duplicate match recommendations

  for (const lostItem of userLostItems) {
    for (const foundItem of candidateFoundItems) {
      const pairKey = `${lostItem.id}-${foundItem.id}`;
      if (seenPairings.has(pairKey)) continue;

      const matchResult = calculateMatchScore(lostItem, foundItem);

      if (matchResult.score >= threshold) {
        seenPairings.add(pairKey);
        userMatches.push({
          myLostItem: {
            id: lostItem.id,
            title: lostItem.title,
            category_name: lostItem.category_name,
            location: lostItem.location,
            date: lostItem.item_date
          },
          foundItem: {
            id: foundItem.id,
            title: foundItem.title,
            category_name: foundItem.category_name,
            location: foundItem.location,
            color: foundItem.color,
            date: foundItem.item_date,
            image_path: foundItem.image_path,
            status: foundItem.status,
            qr_token: foundItem.qr_token
          },
          matchPercentage: matchResult.score,
          breakdown: matchResult.breakdown,
          matchingReasons: matchResult.reasons,
          isPossibleMatch: true
        });
      }
    }
  }

  // Sort descending by highest score
  userMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return userMatches;
}

module.exports = {
  WEIGHTS,
  normalizeText,
  extractTokens,
  compareCategories,
  compareKeywords,
  compareColors,
  compareLocations,
  compareDateProximity,
  calculateMatchScore,
  findMatchesForItem,
  findMatchesForUser
};

