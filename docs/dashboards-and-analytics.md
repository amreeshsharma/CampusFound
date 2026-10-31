# CampusFind 2.0 - Dashboards, Analytics & Notification System

## Overview

**Phase 8** implements the operational hub of **CampusFind 2.0**, providing tailored interfaces for students and administrators, driven entirely by real-time MySQL relational queries and interactive Chart.js visualizations.

---

## 1. Student Dashboard Architecture

### KPI Metrics (`GET /api/dashboard/student-stats`)
Calculates real-time figures scoped strictly to the authenticated student's session:
- **Total Reports**: `SELECT COUNT(*) FROM items WHERE user_id = ?`
- **Active Lost Items**: `SELECT COUNT(*) FROM items WHERE user_id = ? AND item_type = 'lost'`
- **Found Belongings**: `SELECT COUNT(*) FROM items WHERE user_id = ? AND item_type = 'found'`
- **Possible Matches**: Determined dynamically by the deterministic rule-based matching engine (`matchingService.findMatchesForUser`)
- **Pending Claims**: `SELECT COUNT(*) FROM claims WHERE claimant_id = ? AND status = 'pending'`
- **Approved Claims**: `SELECT COUNT(*) FROM claims WHERE claimant_id = ? AND status = 'approved'`

### Student Quick Operations
- **Report Lost Item** (`report-lost.html`)
- **Report Found Item** (`report-found.html`)
- **Browse Lost Items** (`lost-items.html`)
- **Browse Found Items** (`found-items.html`)
- **Track Ownership Claims** (`my-claims.html`)

### Dynamic Panels
- **My Recently Reported Items**: Tabular listing of recent reports with category pills, status badges, and direct links to detail views.
- **Rule-Based Match Alert Card**: Live cards with explainable criteria breakdown and one-click claim submission.
- **Recent Notifications & Alerts**: Recent updates with human-friendly timestamps and event-type color bullets.

---

## 2. Administrator Governance Dashboard

### Campus-Wide KPI Stat Counters (`GET /api/dashboard/admin-stats`)
- **Total Users**: Total student and staff registered accounts.
- **Total Lost Reports**: Total items reported missing across campus.
- **Total Found Reports**: Total found property items logged in campus custody.
- **Total Claims**: Cumulative ownership claims filed.
- **Pending Claims**: Active claims requiring immediate administrative review.
- **Resolved Cases**: Items with status `recovered` or `closed`.

### Admin Management Sections
1. **Claim Management**:
   - Inspect claimant name, student ID, target item, and submitted verification statement.
   - Interactive modal prompts for approval pickup remarks or rejection audit notes.
   - Automatically marks item as `recovered` and dispatches collection notifications upon approval.
2. **Item Management**:
   - Comprehensive campus registry table showing item ID, title, type, category, location, QR tag, and status.
   - Direct item removal / deletion capability (`DELETE /api/items/:id`).
3. **User Management**:
   - Renders registered accounts with name, student roll/ID, email, department, role, and registration date.
   - Strict security: Password hashes are completely excluded from payloads.
4. **Category Management**:
   - Lists all item classification categories with live count of associated items.
   - Interactive creation form (`POST /api/categories`) with duplicate prevention.
5. **Recent Activities Stream**:
   - Real-time audit trail aggregating lost reports, found reports, and claim actions with timestamps.

---

## 3. Visual Analytics Engine (Chart.js)

The platform analytics tab renders 4 dynamic charts connected to `GET /api/dashboard/analytics`:
1. **Lost vs Found Distribution**:
   - **Type**: Doughnut Chart
   - **Colors**: Coral Red (`#C84B4B`) for Lost, Deep Teal (`#004953`) for Found.
2. **Monthly Item Reports Trend**:
   - **Type**: Grouped Bar Chart
   - **Data**: Chronological monthly lost vs found items for the last 6 months.
3. **Ownership Claim Status Distribution**:
   - **Type**: Doughnut Chart
   - **Data**: Distribution across `Pending` (`#D99A36`), `Approved` (`#23865B`), `Rejected` (`#C84B4B`), and `Verified` (`#004953`).
4. **Most Frequently Reported Categories**:
   - **Type**: Bar Chart
   - **Data**: Top categories ranked by cumulative item reports.

*Note: Chart instances are systematically managed in `chartInstances` and destroyed before re-render to prevent canvas memory leaks.*

---

## 4. Notification System & Real-Time Badges

### REST API Endpoints
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/notifications` | Private | Retrieve user notifications feed (limit 50) |
| `GET` | `/api/notifications/unread-count` | Private | Get unread count for navbar and sidebar badges |
| `PUT` | `/api/notifications/:id/read` | Private | Mark single notification as read |
| `PUT` | `/api/notifications/read-all` | Private | Mark all notifications for the user as read |
| `DELETE` | `/api/notifications/:id` | Private | Delete notification record |

### Real-Time UI Integration
- Top navigation bar displays a dynamic red unread badge indicator next to the bell icon.
- Unread badge automatically updates upon clicking "Mark All as Read" or "Mark as Read".
- Color-coded badges distinguish: `SMART MATCH` (Amber), `CLAIM APPROVED` (Green), `CLAIM REJECTED` (Red), `CLAIM RECORDED` (Blue), and `GENERAL` (Teal).

---

## 5. Responsive Design Across Breakpoints

- **Desktop (>=1024px)**: Dual-column grid, persistent sidebar navigation, 6-card stat grids, and side-by-side analytical charts.
- **Tablets (768px - 1024px)**: Single-column dashboard grid, 2x2 chart layout, and flexible tables.
- **Mobile (<768px)**:
  - Slide-out mobile drawer sidebar toggled via `#sidebar-toggle-btn`.
  - Auto-wrapping KPI cards using CSS Grid `repeat(auto-fit, minmax(160px, 1fr))`.
  - Horizontally scrollable data tables (`.table-responsive`) with styled touch scrollbars.
  - Stacked 100% width Chart.js canvases with automatic aspect ratio recalculation.

---

## 6. Security & Role-Based Access Control (RBAC)

- `authMiddleware` validates JWT from HTTP-only cookies on all student dashboard and notification endpoints.
- `adminMiddleware` strictly restricts `/api/dashboard/admin-stats`, `/api/dashboard/analytics`, `/api/users`, and `POST /api/categories` to users with `role: 'admin'`.
- All database queries are parameterized (`?`) to prevent SQL injection vulnerabilities.
- Data isolation ensures students can never view or manipulate another student's dashboard metrics or private claims.

