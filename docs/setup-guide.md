# CampusFind 2.0 - Local Setup & Execution Guide

## System Prerequisites
1. **Node.js**: v18.0.0 or later (v24.19.0 verified)
2. **npm**: v9.0.0 or later (v11.17.0 verified)
3. **MySQL**: v8.0 or XAMPP MySQL

## Step 1: Backend Setup
```bash
# Navigate to the backend folder
cd backend

# Install dependencies (already executed in Phase 1)
npm install

# Check environment variables
# Copy .env.example to .env if not present
cp .env.example .env
```

## Step 2: Start the Backend Server
```bash
# Production mode
npm start

# Or development mode with auto-reload
npm run dev
```
The server will bind to `http://localhost:5000`.
Test health endpoint: `http://localhost:5000/api/health`

## Step 3: Frontend Execution
The frontend is built with vanilla HTML5, CSS3, and JavaScript, requiring no build tools or bundling steps.
Simply serve the `frontend/` directory with VS Code Live Server or any static HTTP server.
Example:
```bash
npx serve ../frontend -p 5500
```
Then visit `http://localhost:5500` in any modern web browser.

