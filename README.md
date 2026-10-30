# CampusFind 2.0 🎓
### Smart Campus Lost & Found Management Platform
> **A Full-Stack Web Application for College Campuses**  
> Developed for B.Tech Computer Science and Engineering (Web Technology PBL)

---

## 🌟 Overview

**CampusFind 2.0** is an enterprise-grade, responsive full-stack platform designed to eliminate the chaos of lost and misplaced belongings across college campuses. It bridges the gap between students who lose items and good Samaritans or security staff who find them.

### Key Innovations
- 🧠 **Rule-Based Smart Item Matching**: An automated scoring engine that computes weighted similarity (category, keywords, color, location, date proximity) to proactively suggest potential matches between lost and found items.
- 📱 **QR-Code Item Tagging & Verification**: Generates tamper-resistant QR codes for found items deposited at campus security/desks, allowing verified ownership claims without publicly exposing sensitive item identifiers.
- 🛡️ **Role-Based Governance (RBAC)**: Secure separation between Student and Administrative workflows, complete with audit remarks, claim reviews, and platform analytics.

---

## 🎨 Brand & Design System

CampusFind 2.0 adheres to a modern, human-centric SaaS dashboard aesthetic:
- **Primary Brand Color**: `#004953` (Deep Teal) — Navbar, primary buttons, headings
- **Secondary Brand Color**: `#EFDECD` (Warm Beige) — Badges, accents, highlights
- **Canvas / Background**: `#FAF8F5` (Light Pearl)
- **Text Primary**: `#183438` (Deep Charcoal Slate)
- **Text Muted**: `#687B7D` (Slate Grey)
- **Success / Warning / Error**: `#23865B` / `#D99A36` / `#C84B4B`

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Flexbox & CSS Grid, Custom Variables), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js (Modular Controllers, Routes, Middleware, Services) |
| **Database** | MySQL 8.0, `mysql2` connection pool |
| **Authentication** | JSON Web Tokens (JWT), `bcryptjs` password hashing |
| **File Storage** | `multer` for secure item photograph uploads |
| **QR Code Engine** | `qrcode` for unique claim tokens and item tagging |
| **Analytics & Visuals** | Chart.js for admin metrics and reporting trends |

---

## 📁 Project Architecture

```
CampusFind/
│
├── frontend/                     # Pure HTML5, CSS3, and Vanilla JavaScript UI
│   ├── index.html                # Public Landing Page
│   ├── pages/                    # Multi-page Student & Admin views
│   ├── css/                      # Modular CSS with variables & responsive styles
│   ├── js/                       # Modular client scripts, auth, and API handlers
│   └── assets/                   # Logos, icons, and illustrations
│
├── backend/                      # Node.js & Express.js REST API Server
│   ├── server.js                 # Server entry point
│   ├── package.json              # Backend dependencies
│   ├── .env.example              # Environment variable template
│   ├── config/                   # MySQL connection pool
│   ├── controllers/              # Route business logic handlers
│   ├── routes/                   # RESTful API route definitions
│   ├── middleware/               # Auth, role check, and upload middlewares
│   ├── services/                 # Rule-based matching, QR generator, notifications
│   └── uploads/                  # Uploaded item photographs
│
├── database/                     # MySQL Relational Schema & Seed Data
│   ├── schema.sql                # Complete DDL schema with constraints & indexes
│   ├── seed.sql                  # Realistic college campus sample dataset
│   └── README.md                 # Database setup and execution instructions
│
├── docs/                         # Comprehensive Academic & Technical Docs
│   ├── project-overview.md       # High-level architecture and PBL relevance
│   ├── api-documentation.md      # Full REST API endpoints specification
│   ├── database-design.md        # ER diagram, schema relations & normalization
│   └── setup-guide.md            # Step-by-step local setup guide
│
├── .gitignore                    # Ignored files (node_modules, .env, uploads)
└── README.md                     # Project documentation root
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MySQL Server** (v8.0 or XAMPP / MariaDB)

### 1. Clone & Enter Directory
```bash
cd PBL_WT/backend
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your MySQL credentials (`DB_USER`, `DB_PASSWORD`, `DB_NAME`).

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Backend Server
```bash
# Production start
npm start

# Development mode with hot-reload
npm run dev
```
The server will boot at `http://localhost:5000` with a verified health endpoint at `http://localhost:5000/api/health`.

### 5. Launch Frontend
Serve the `frontend/` directory using VS Code Live Server or any static HTTP server:
```bash
# Using npx serve or Live Server extension
npx serve ../frontend -p 5500
```
Open `http://localhost:5500` in your web browser.

---

## 📅 Development Roadmap (10 Phases)

- [x] **Phase 1**: Project Setup, Folder Architecture, Brand Variables, Express Server Baseline
- [ ] **Phase 2**: UI/UX & Frontend Foundation (Landing, Auth, Responsive Design)
- [ ] **Phase 3**: MySQL Database Schema, Connection Pool, and Seed Dataset
- [ ] **Phase 4**: JWT Authentication, Role-based Middleware & Profile APIs
- [ ] **Phase 5**: Lost and Found Item Management with Multer Uploads
- [ ] **Phase 6**: Rule-Based Smart Item Matching Engine
- [ ] **Phase 7**: Ownership Claims Workflow & QR Code Verification System
- [ ] **Phase 8**: Student & Admin Dashboards with Chart.js Analytics
- [ ] **Phase 9**: Full End-to-End Integration, Validation & Security Audit
- [ ] **Phase 10**: Polishing, Demonstration Readiness & Academic Presentation Pack

---

## 👨‍💻 Academic Information
- **Course**: B.Tech Computer Science & Engineering
- **Subject**: Web Technology Project-Based Learning (PBL)
- **Year / Semester**: 2nd Year / 4th Semester

