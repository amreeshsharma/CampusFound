# CampusFind 2.0 - Claim Management & QR Custody Verification

## Overview

The **Claim Management & QR Custody Verification System** is an integral module of **CampusFind 2.0**. It governs the end-to-end lifecycle of how lost campus property is claimed by students, audited by campus security administrators, and physically handed over using tamper-resistant QR code tokens.

---

## 1. Ownership Claim Workflow & State Transitions

### State Machine Lifecycle

```
[Open Found Item] 
       │
       ▼ (Student submits verification statement)
[Claim Pending / Under Review]
       │
       ├─────────────────────────────────────────┐
       │ (Admin Approves)                         │ (Admin Rejects)
       ▼                                         ▼
[Claim: Approved]                         [Claim: Rejected]
       │                                         │
       ▼                                         ├─ If other claims pending: remain 'claim_pending'
[Item: Recovered & Closed]                        └─ If no other claims: item returns to 'open'
```

### Claim Status Definitions
1. **`pending`**: Claim submitted by a student awaiting administrative audit.
2. **`verified`**: Security staff has inspected physical evidence (optional preliminary stage).
3. **`approved`**: Administrator verifies ownership match. The item status transitions to `recovered`, any competing pending claims are automatically rejected, and pickup instructions are dispatched.
4. **`rejected`**: Administrator logs mismatch remarks. The claimant is notified, and if no other active claims exist, the item returns to `open` status for other students to claim.

---

## 2. Anti-Abuse & Validation Rules

To prevent fraudulent claims and ensure campus integrity:
- **Authentication Required**: Only verified students logged in with their college account can submit claims.
- **Found Items Only**: Claims cannot be filed against items reported as `lost` (HTTP 400).
- **No Self-Claims**: A student who reported finding an item cannot submit an ownership claim on that same item (HTTP 400).
- **Duplicate Prevention**: A student cannot file more than one active (`pending`, `verified`, `approved`) claim on the same item (HTTP 409 Conflict).
- **Closed / Recovered Guards**: Claims cannot be submitted on items already marked `recovered` or `closed` (HTTP 400).
- **Evidence Requirement**: Submissions require non-trivial descriptive identifying statements (at least 5 characters) that prove ownership (HTTP 400).

---

## 3. Dynamic QR Code Token Architecture

### Token Specification
- Each found item automatically receives a unique, random custody token upon report creation:
  ```
  QR-FND-{timestamp_base36}-{random_base36}-{3_digit_code}
  ```
- **Example**: `QR-FND-MVWNNCPM-K89-342`
- Formatted with unique alphanumeric strings to prevent sequential token scraping.

### QR Code Generation (`backend/services/qrService.js`)
- Uses `qrcode` library with Level `'H'` error correction (30% recovery capability for damaged physical tags).
- Brand-aligned high-contrast palette:
  - Modules: `#004953` (Deep Teal brand primary)
  - Background: `#FFFFFF` (Clean white)
- Encodes the secure verification URL:
  ```
  http://localhost:5000/pages/verify-item.html?token={TOKEN}
  ```

---

## 4. Privacy & FERPA Compliance (`verify-item.html`)

When a QR code is scanned:
1. The client opens the verification portal: `pages/verify-item.html?token=...`.
2. The frontend calls the sanitized endpoint `GET /api/items/verify-qr/:token`.
3. **FERPA Protection**:
   - The API **strictly omits** finder names, email addresses, phone numbers, and student IDs.
   - Only public custody facts are rendered: Title, Category, Location Found, Date Logged, Color, and Official Custody Status.
   - If the item is `open`, a student can immediately submit an ownership claim.

---

## 5. REST API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/claims` | Private (Student) | Submit an ownership claim for a found item |
| `GET` | `/api/claims/my-claims` | Private (Student) | Retrieve all claims submitted by the logged-in student |
| `GET` | `/api/claims/:id` | Private (Owner/Admin) | Retrieve detailed claim record by ID |
| `GET` | `/api/claims` | Private (Admin Only) | List all claims across campus with claimant details |
| `PUT` | `/api/claims/:id/status` | Private (Admin Only) | Approve or reject a claim with audit remarks |
| `GET` | `/api/items/:id/qrcode` | Public / Private | Generate Base64 PNG QR code & verification URL |
| `GET` | `/api/items/verify-qr/:token` | Public | Validate custody token & return sanitized public details |

