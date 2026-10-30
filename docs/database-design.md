# CampusFind 2.0 - Database Design & Architecture

> **B.Tech Computer Science and Engineering &bull; Web Technology Project-Based Learning (PBL)**

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ ITEMS : "reports"
    USERS ||--o{ CLAIMS : "submits"
    USERS ||--o{ NOTIFICATIONS : "receives"
    CATEGORIES ||--o{ ITEMS : "classifies"
    ITEMS ||--o{ CLAIMS : "subject_of"

    USERS {
        int id PK
        string name
        string email UK
        string password
        enum role "student, admin"
        string student_id
        string department
        string phone
        timestamp created_at
    }

    CATEGORIES {
        int id PK
        string category_name UK
        string description
        timestamp created_at
    }

    ITEMS {
        int id PK
        int user_id FK
        int category_id FK
        string title
        text description
        enum item_type "lost, found"
        string color
        string location
        date item_date
        string image_path
        enum status "open, claim_pending, recovered, closed"
        string qr_token UK
        timestamp created_at
    }

    CLAIMS {
        int id PK
        int item_id FK
        int claimant_id FK
        text verification_details
        enum status "pending, verified, approved, rejected"
        text admin_remarks
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        text message
        enum notification_type "match, claim_submitted, claim_approved, claim_rejected, item_recovered, general"
        boolean is_read
        timestamp created_at
    }
```

---

## 2. Relational Schema & Cardinality Details

1. **`USERS` &rarr; `ITEMS` (1 : N)**
   - One user (student or staff) can report zero, one, or multiple lost or found items.
   - `items.user_id` references `users.id` with `ON DELETE CASCADE`.
2. **`CATEGORIES` &rarr; `ITEMS` (1 : N)**
   - A standardized category classifies multiple reported items.
   - `items.category_id` references `categories.id` with `ON DELETE SET NULL`.
3. **`ITEMS` &rarr; `CLAIMS` (1 : N)**
   - An item (specifically a found belonging) may receive ownership claims from claimants.
   - `claims.item_id` references `items.id` with `ON DELETE CASCADE`.
4. **`USERS` &rarr; `CLAIMS` (1 : N)**
   - A student (`claimant_id`) submits verification claims for their lost items.
   - `claims.claimant_id` references `users.id` with `ON DELETE CASCADE`.
5. **`USERS` &rarr; `NOTIFICATIONS` (1 : N)**
   - Users receive system notifications regarding match alerts and claim resolutions.
   - `notifications.user_id` references `users.id` with `ON DELETE CASCADE`.

---

## 3. Database Normalization (3NF Justification)

CampusFind 2.0 satisfies **Third Normal Form (3NF)**:
- **1NF**: All table columns hold atomic, scalar values (no repeating groups, comma-separated lists, or nested objects).
- **2NF**: All non-key attributes are fully functionally dependent on the entire primary key (`id`).
- **3NF**: There are no transitive dependencies; non-key attributes depend only on the primary key (e.g., category names are stored in `categories` rather than repeating strings in `items`).

---

## 4. Database Connection Procedure (Connection Pooling)

Connection pooling is implemented using `mysql2/promise` in `backend/config/db.js`:

```javascript
const mysql = require('mysql2');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
const db = pool.promise();
```

### Advantages of Connection Pooling:
- Avoids the overhead of establishing a new TCP handshake on every incoming HTTP request.
- Manages connection lifecycle gracefully under high campus traffic.
- Transparently recycles idle connections with `enableKeepAlive: true`.

