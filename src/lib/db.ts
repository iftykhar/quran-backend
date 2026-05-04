import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export const connectDB = async () => {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), 'data', 'quran.db');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Optimization PRAGMAs
  await db.run('PRAGMA journal_mode = WAL;');
  await db.run('PRAGMA synchronous = NORMAL;');
  await db.run('PRAGMA cache_size = 10000;'); // 10MB cache
  await db.run('PRAGMA foreign_keys = ON;');

  return db;
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};
