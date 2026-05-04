import { connectDB } from './src/lib/db';

async function checkDuplicates() {
  const db = await connectDB();
  
  console.log('--- Checking quranar ---');
  const quranarDupes = await db.all('SELECT SuraIDAr, VerseIDAr, COUNT(*) as count FROM quranar GROUP BY SuraIDAr, VerseIDAr HAVING count > 1 LIMIT 10');
  console.log('quranar duplicates:', quranarDupes);

  console.log('--- Checking en_yusufali ---');
  const enDupes = await db.all('SELECT sura, aya, COUNT(*) as count FROM en_yusufali GROUP BY sura, aya HAVING count > 1 LIMIT 10');
  console.log('en_yusufali duplicates:', enDupes);

  console.log('--- Checking bn_bengali ---');
  const bnDupes = await db.all('SELECT sura, aya, COUNT(*) as count FROM bn_bengali GROUP BY sura, aya HAVING count > 1 LIMIT 10');
  console.log('bn_bengali duplicates:', bnDupes);

  console.log('--- Checking audio ---');
  const audioDupes = await db.all('SELECT sura_no, COUNT(*) as count FROM audio GROUP BY sura_no HAVING count > 1 LIMIT 10');
  console.log('audio duplicates:', audioDupes);

  await db.close();
}

checkDuplicates().catch(console.error);
