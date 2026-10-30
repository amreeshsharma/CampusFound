/**
 * CampusFind 2.0 - Database Initialization & Seed Script
 * Reads schema.sql and seed.sql and executes them via the MySQL connection pool
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setupDatabase() {
  console.log('--- CampusFind 2.0: Database Setup ---');

  // Connect without database first to ensure database existence
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    multipleStatements: true
  });

  try {
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

    console.log(`[1/3] Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[2/3] Executing schema DDL...');
    await connection.query(schemaSql);
    console.log('      Schema created successfully (users, categories, items, claims, notifications).');

    console.log(`[3/3] Reading & executing seed data from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('      Realistic demonstration seed data inserted successfully.');

    console.log('========================================================');
    console.log(' CampusFind 2.0 Database Setup Completed Successfully! ');
    console.log(' Database Name: campusfind_db');
    console.log('========================================================');
  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupDatabase();

