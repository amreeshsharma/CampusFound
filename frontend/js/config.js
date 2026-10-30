/**
 * CampusFind 2.0 - Frontend Configuration
 * Manages API endpoints and system constants
 */

const CONFIG = {
  // Base API configuration (matches backend PORT 5000)
  API_BASE_URL: 'http://localhost:5000/api',
  SERVER_URL: 'http://localhost:5000',
  UPLOAD_URL: 'http://localhost:5000/uploads',

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

