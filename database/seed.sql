-- =============================================================================
-- CampusFind 2.0 - Realistic Demonstration Seed Dataset (DML)
-- Database: campusfind_db
-- =============================================================================

USE campusfind_db;

-- Clear previous records in foreign key order
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE claims;
TRUNCATE TABLE items;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. SEED USERS
-- Password for all student accounts is: student123
-- Password for admin account is: admin123
-- Both hashed with bcrypt (salt rounds = 10)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password, role, student_id, department, phone) VALUES
(1, 'Rahul Sharma', 'student@campus.edu', '$2a$10$xkA6WTSdwh6zr7sYJZ2Bvuq328FATGozkQkItIFhTHQPmF49zip4y', 'student', '23CSE089', 'Computer Science & Engineering', '+91 98765 43210'),
(2, 'Ananya Patel', 'ananya@campus.edu', '$2a$10$xkA6WTSdwh6zr7sYJZ2Bvuq328FATGozkQkItIFhTHQPmF49zip4y', 'student', '22ECE045', 'Electronics & Communication', '+91 98765 43211'),
(3, 'Campus Security Admin', 'admin@campusfind.edu', '$2a$10$Cg60NsB25yyq/TqQrRBQR.GFOFvVKeeiJmLC8lwYsCqgLQTawjRcG', 'admin', 'STAFF-001', 'Campus Security Command', '+91 98765 43299'),
(4, 'Karan Verma', 'karan@campus.edu', '$2a$10$xkA6WTSdwh6zr7sYJZ2Bvuq328FATGozkQkItIFhTHQPmF49zip4y', 'student', '24ME019', 'Mechanical Engineering', '+91 98765 43212');

-- -----------------------------------------------------------------------------
-- 2. SEED CATEGORIES
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, category_name, description) VALUES
(1, 'Electronics & Gadgets', 'Laptops, calculators, chargers, earphones, flash drives, power banks'),
(2, 'Books & Stationery', 'Textbooks, lab journals, notebooks, scientific drawing instruments'),
(3, 'ID Cards & Wallets', 'College student IDs, ATM cards, library cards, wallets, passes'),
(4, 'Bottles & Containers', 'Insulated flasks, water bottles, lunchboxes, tumblers'),
(5, 'Keys & Accessories', 'Hostel keys, vehicle keys, lanyards, glasses, umbrellas'),
(6, 'Bags & Backpacks', 'College bags, laptop sleeves, gym bags, pouches');

-- -----------------------------------------------------------------------------
-- 3. SEED ITEMS
-- -----------------------------------------------------------------------------
INSERT INTO items (id, user_id, category_id, title, description, item_type, color, location, item_date, image_path, status, qr_token) VALUES
-- Item 1: Lost by Rahul Sharma (Will match with Item 2!)
(1, 1, 1, 'Casio Scientific Calculator fx-991EX', 'Has silver name sticker "Rahul S." on the rear slide cover with minor scratch on the left corner.', 'lost', 'Black', 'Mechanical Lab 3', '2026-10-29', '/uploads/sample-calculator.jpg', 'open', NULL),

-- Item 2: Found by Admin at Mech Lab 3 (Matches Item 1 with 92% similarity score!)
(2, 3, 1, 'Casio fx-991EX Classwiz Calculator', 'Handed over to security desk from Mech Lab bench. Slide cover attached with sticker markings.', 'found', 'Black', 'Mechanical Lab 3', '2026-10-30', '/uploads/sample-calculator.jpg', 'claim_pending', 'QR-FND-88219'),

-- Item 3: Found by Ananya Patel at Library
(3, 2, 4, 'Blue Hydro Flask Water Bottle', 'Found on study desk #14 near computer terminals. Metallic 32oz bottle with stickers.', 'found', 'Ocean Blue', 'Central Library, 2nd Floor', '2026-10-28', '/uploads/sample-bottle.jpg', 'open', 'QR-FND-33412'),

-- Item 4: Lost by Karan Verma
(4, 4, 1, 'Black HP Laptop Charger (65W USB-C)', 'Left plugged into wall socket behind the reference bookshelves in the reading room.', 'lost', 'Black', 'Campus Library, Ground Floor', '2026-10-26', NULL, 'open', NULL),

-- Item 5: Found by Admin at Cafeteria
(5, 3, 3, 'College ID Card - CSE Dept', 'Found at counter 2. Belongs to student roll number 23CSE045.', 'found', 'White / Blue Lanyard', 'Cafeteria Counter 2', '2026-10-30', NULL, 'open', 'QR-FND-19402'),

-- Item 6: Found by Admin & Recovered
(6, 3, 1, 'Noise Cancelling Wireless Earbuds Case', 'White magnetic charging case found under seat after cultural briefing in auditorium.', 'found', 'White', 'Main Auditorium, Row F', '2026-10-25', NULL, 'recovered', 'QR-FND-43921');

-- -----------------------------------------------------------------------------
-- 4. SEED CLAIMS
-- -----------------------------------------------------------------------------
INSERT INTO claims (id, item_id, claimant_id, verification_details, status, admin_remarks) VALUES
(1, 2, 1, 'Sticker on rear battery cover reads "Rahul S." and serial ends with 401.', 'pending', 'Under physical audit by Security Officer at Desk 1.'),
(2, 6, 2, 'Left earbud has minor dent near charging contact; case serial starts with SN-78.', 'approved', 'Approved! Verified serial number match. Handed over at Security Desk Counter 1.');

-- -----------------------------------------------------------------------------
-- 5. SEED NOTIFICATIONS
-- -----------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, message, notification_type, is_read) VALUES
(1, 1, 'Smart Match Detected (92%): Found item "Casio fx-991EX Classwiz Calculator" matches your lost report from Mech Lab 3.', 'match', FALSE),
(2, 2, 'Your ownership claim for "Noise Cancelling Wireless Earbuds Case" has been approved for pickup.', 'claim_approved', TRUE),
(3, 1, 'Your lost report for "Casio Scientific Calculator fx-991EX" has been published to the campus feed.', 'general', TRUE);

