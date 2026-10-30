-- =============================================================================
-- CampusFind 2.0 - Relational Database Schema (DDL)
-- Database: campusfind_db
-- Designed for B.Tech CSE Web Technology Project-Based Learning (PBL)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS campusfind_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE campusfind_db;

-- Temporarily disable foreign key constraints for clean table recreations
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores student and administrative accounts with hashed credentials
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  student_id VARCHAR(50) NULL,
  department VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- Organizes items into standardized campus belonging classifications
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. ITEMS TABLE
-- Stores lost and found belonging reports with images and QR custody tokens
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS items;
CREATE TABLE items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  item_type ENUM('lost', 'found') NOT NULL,
  color VARCHAR(50) NOT NULL,
  location VARCHAR(200) NOT NULL,
  item_date DATE NOT NULL,
  image_path VARCHAR(255) NULL,
  status ENUM('open', 'claim_pending', 'recovered', 'closed') NOT NULL DEFAULT 'open',
  qr_token VARCHAR(100) NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_items_type (item_type),
  INDEX idx_items_status (status),
  INDEX idx_items_category (category_id),
  INDEX idx_items_user (user_id),
  INDEX idx_items_date (item_date),
  INDEX idx_items_qr (qr_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. CLAIMS TABLE
-- Tracks ownership verification audits, hidden details, and admin outcomes
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS claims;
CREATE TABLE claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  claimant_id INT NOT NULL,
  verification_details TEXT NOT NULL,
  status ENUM('pending', 'verified', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_claims_claimant FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_claims_item (item_id),
  INDEX idx_claims_claimant (claimant_id),
  INDEX idx_claims_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE
-- Real-time user alerts for match notifications, claim reviews, and recoveries
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('match', 'claim_submitted', 'claim_approved', 'claim_rejected', 'item_recovered', 'general') NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

