# CampusFind 2.0 - Relational Database Architecture

This directory contains the complete MySQL 8.0 schema DDL (`schema.sql`) and sample seed DML dataset (`seed.sql`) for **CampusFind 2.0**.

---

## 1. Database Specifications

- **Database Engine**: MySQL 8.0 / MariaDB
- **Storage Engine**: `InnoDB` (ACID compliant, supports foreign key constraints)
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Database Name**: `campusfind_db`

---

## 2. Table Summary & Descriptions

| # | Table Name | Purpose | Primary Key | Foreign Keys |
|---|---|---|---|---|
| 1 | **`users`** | Student and administrative accounts | `id` (INT Auto-inc) | None |
| 2 | **`categories`** | Standardized belonging categories | `id` (INT Auto-inc) | None |
| 3 | **`items`** | Reported lost and found belongings | `id` (INT Auto-inc) | `user_id` &rarr; `users(id)`, `category_id` &rarr; `categories(id)` |
| 4 | **`claims`** | Ownership verification audits | `id` (INT Auto-inc) | `item_id` &rarr; `items(id)`, `claimant_id` &rarr; `users(id)` |
| 5 | **`notifications`**| User alerts for matches & claims | `id` (INT Auto-inc) | `user_id` &rarr; `users(id)` |

---

## 3. Schema Fields Breakdown

### 1. `users`
- `id` (INT, PK, AUTO_INCREMENT)
- `name` (VARCHAR(100), NOT NULL)
- `email` (VARCHAR(150), NOT NULL, UNIQUE)
- `password` (VARCHAR(255), NOT NULL) &mdash; Encrypted using bcrypt (salt rounds: 10)
- `role` (ENUM('student', 'admin'), DEFAULT 'student')
- `student_id` (VARCHAR(50), NULL)
- `department` (VARCHAR(100), NULL)
- `phone` (VARCHAR(20), NULL)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### 2. `categories`
- `id` (INT, PK, AUTO_INCREMENT)
- `category_name` (VARCHAR(100), NOT NULL, UNIQUE)
- `description` (VARCHAR(255), NULL)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### 3. `items`
- `id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, FK &rarr; `users.id` ON DELETE CASCADE)
- `category_id` (INT, FK &rarr; `categories.id` ON DELETE SET NULL)
- `title` (VARCHAR(200), NOT NULL)
- `description` (TEXT, NOT NULL)
- `item_type` (ENUM('lost', 'found'), NOT NULL)
- `color` (VARCHAR(50), NOT NULL)
- `location` (VARCHAR(200), NOT NULL)
- `item_date` (DATE, NOT NULL)
- `image_path` (VARCHAR(255), NULL)
- `status` (ENUM('open', 'claim_pending', 'recovered', 'closed'), DEFAULT 'open')
- `qr_token` (VARCHAR(100), NULL, UNIQUE)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### 4. `claims`
- `id` (INT, PK, AUTO_INCREMENT)
- `item_id` (INT, FK &rarr; `items.id` ON DELETE CASCADE)
- `claimant_id` (INT, FK &rarr; `users.id` ON DELETE CASCADE)
- `verification_details` (TEXT, NOT NULL)
- `status` (ENUM('pending', 'verified', 'approved', 'rejected'), DEFAULT 'pending')
- `admin_remarks` (TEXT, NULL)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

### 5. `notifications`
- `id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, FK &rarr; `users.id` ON DELETE CASCADE)
- `message` (TEXT, NOT NULL)
- `notification_type` (ENUM('match', 'claim_submitted', 'claim_approved', 'claim_rejected', 'item_recovered', 'general'), DEFAULT 'general')
- `is_read` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

---

## 4. Execution Commands (How to Run)

### Using MySQL Command Line Client:
```bash
# Apply Schema DDL
mysql -u root -p < database/schema.sql

# Apply Seed Data DML
mysql -u root -p < database/seed.sql
```

### Using PowerShell:
```powershell
Get-Content database\schema.sql | & mysql -u root -p
Get-Content database\seed.sql | & mysql -u root -p
```
