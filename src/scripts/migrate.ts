import fs from 'fs';
import path from 'path';
import { connectDB } from '../lib/db';

const dumpFile = path.resolve(process.cwd(), 'alquranb_db(all_tables).sql');

/**
 * Convert a MySQL CREATE TABLE statement to SQLite-compatible SQL.
 */
function convertCreateTable(stmt: string): string {
  return stmt
    .replace(/ENGINE=\w+[^;]*/gi, '')           // Remove ENGINE=... clause
    .replace(/DEFAULT CHARSET=\w+/gi, '')
    .replace(/COLLATE=\w+/gi, '')
    .replace(/CHARACTER SET \w+/gi, '')          // Remove CHARACTER SET from columns
    .replace(/COLLATE \w+/gi, '')                // Remove COLLATE from columns
    .replace(/int\(\d+\)/gi, 'INTEGER')          // int(11) -> INTEGER
    .replace(/smallint\(\d+\)/gi, 'INTEGER')
    .replace(/varchar\(\d+\)/gi, 'TEXT')
    .replace(/longtext/gi, 'TEXT')
    .replace(/DEFAULT '([^']*)'/g, "DEFAULT '$1'") // Keep defaults
    .trim();
}

/**
 * Convert a MySQL INSERT statement to SQLite-compatible SQL.
 */
function convertInsert(stmt: string): string {
  return stmt
    .replace(/\\'/g, "''")   // MySQL escaped single quotes -> SQLite style
    .replace(/\\"/g, '"')    // MySQL escaped double quotes
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .trim();
}

async function run() {
  const db = await connectDB();
  console.log('Starting migration...');

  const sql = fs.readFileSync(dumpFile, 'utf8');

  // Split into lines and reassemble statements
  const lines = sql.split('\n');
  let currentStatement = '';
  let insideInsert = false;
  let statementsRun = 0;
  let errors = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');

    // Skip comments and empty lines
    if (line.startsWith('--') || line.startsWith('/*') || line.trim() === '') {
      continue;
    }

    // Skip MySQL-specific SET, START, COMMIT, LOCK, UNLOCK, ALTER, DROP statements
    const upper = line.trimStart().toUpperCase();
    if (
      upper.startsWith('SET ') ||
      upper.startsWith('START ') ||
      upper.startsWith('COMMIT') ||
      upper.startsWith('LOCK ') ||
      upper.startsWith('UNLOCK ') ||
      upper.startsWith('ALTER ') ||
      upper.startsWith('DROP ')
    ) {
      // Skip until semicolon
      if (!line.includes(';')) {
        // Multi-line statement, skip subsequent lines too
        while (i + 1 < lines.length && !lines[i + 1].includes(';')) {
          i++;
        }
        i++; // Skip the line with the semicolon
      }
      continue;
    }

    currentStatement += line + '\n';

    // Check if the statement is complete (ends with ;)
    const trimmed = line.trim();
    if (trimmed.endsWith(';')) {
      const stmt = currentStatement.trim();
      currentStatement = '';

      if (stmt.toUpperCase().startsWith('CREATE TABLE')) {
        const converted = convertCreateTable(stmt);
        const tableMatch = converted.match(/CREATE TABLE `(\w+)`/);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        try {
          await db.exec(converted);
          console.log(`✓ Created table: ${tableName}`);
          statementsRun++;
        } catch (e: any) {
          console.error(`✗ Failed to create table ${tableName}: ${e.message}`);
          errors++;
        }
      } else if (stmt.toUpperCase().startsWith('INSERT INTO')) {
        const converted = convertInsert(stmt);
        const tableMatch = converted.match(/INSERT INTO `(\w+)`/);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        try {
          await db.exec(converted);
          statementsRun++;
          process.stdout.write(`✓ Inserted into: ${tableName}\r`);
        } catch (e: any) {
          console.error(`\n✗ Failed to insert into ${tableName}: ${e.message.substring(0, 100)}`);
          errors++;
        }
      }
    }
  }

  console.log(`\n\nMigration finished.`);
  console.log(`  Statements executed: ${statementsRun}`);
  console.log(`  Errors: ${errors}`);

  // Create indexes
  console.log('Creating indexes...');
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_en_yusufali_sura_aya ON en_yusufali(sura, aya);
    CREATE INDEX IF NOT EXISTS idx_bn_bengali_sura_aya  ON bn_bengali(sura, aya);
    CREATE INDEX IF NOT EXISTS idx_quranar_sura_verse   ON quranar(SuraIDAr, VerseIDAr);
    CREATE INDEX IF NOT EXISTS idx_audio_sura_no        ON audio(sura_no);
    CREATE INDEX IF NOT EXISTS idx_sura_sura_no         ON sura(sura_no);
    CREATE INDEX IF NOT EXISTS idx_tafsir_sura_ayat     ON tafsir(sura, ayat);
  `);
  console.log('Indexes created.');

  await db.close();
  console.log('Done.');
}

run().catch(console.error);
