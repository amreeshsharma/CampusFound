/**
 * CampusFind 2.0 - Frontend Configuration
 * Manages API endpoints and system constants
 */

const getBaseServerUrl = () => {
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes(':5000')) {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

const SERVER_BASE = getBaseServerUrl();

const CONFIG = {
  // Base API configuration (matches backend PORT 5000)
  API_BASE_URL: `${SERVER_BASE}/api`,
  SERVER_URL: SERVER_BASE,
  UPLOAD_URL: `${SERVER_BASE}/uploads`,

  // Local Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'campusfind_token',
    USER_DATA: 'campusfind_user',
    THEME: 'campusfind_theme'
  },

  // Item Types & Categories
  ITEM_TYPES: {
    LOST: 'lost',
    FOUND: 'found'
  },

  ITEM_STATUS: {
    OPEN: 'open',
    CLAIM_PENDING: 'claim_pending',
    RECOVERED: 'recovered',
    CLOSED: 'closed'
  },

  CLAIM_STATUS: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  USER_ROLES: {
    STUDENT: 'student',
    ADMIN: 'admin'
  }
};

// Freeze configuration object to prevent runtime mutations
Object.freeze(CONFIG);
