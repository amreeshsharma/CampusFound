# CampusFind 2.0 - Project Overview

## 1. Project Background
CampusFind 2.0 is designed for a second-year B.Tech Computer Science and Engineering Web Technology Project-Based Learning (PBL) submission.

## 2. Problem Statement
Every academic semester, hundreds of valuable student belongings—including ID cards, textbooks, scientific calculators, laptops, lab coats, and keys—are misplaced across lecture halls, libraries, auditoriums, and cafeterias. Traditional campus lost-and-found noticeboards are slow, fragmented, and vulnerable to false ownership claims.

## 3. The CampusFind Solution
A centralized, secure, web-based platform that:
1. Allows students to quickly report lost or found items with images, dates, and campus locations.
2. Uses a transparent, rule-based matching engine to calculate similarity scores between lost and found items.
3. Implements secure QR code tagging for found items held at campus security desks.
4. Enforces an administrative claim verification workflow to ensure items are returned only to their rightful owners.

## 4. Architectural Principles
- **Separation of Concerns**: Clean isolation between pure HTML/CSS/JS frontend, Express REST API backend, and relational MySQL database.
- **Explainability**: Code is clean, well-commented, and free of opaque framework magic so that a student can confidently explain every module during a college viva presentation.
- **Robust Security**: Parameterized queries against SQL injection, bcrypt password hashing, JWT stateless authentication, and file type validation on uploads.

