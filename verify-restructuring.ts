import { connectDB } from './src/lib/db';

async function verifyRestructuring() {
  const db = await connectDB();
  
  console.log('--- Verifying Surah 2 (Al-Baqarah) ---');
  
  const ayah0 = await db.get('SELECT * FROM quranar WHERE SuraIDAr = 2 AND VerseIDAr = 0');
  console.log('Ayah 0 (Arabic):', ayah0?.AyahTextAr);

  const ayah1 = await db.get('SELECT * FROM quranar WHERE SuraIDAr = 2 AND VerseIDAr = 1');
  console.log('Ayah 1 (Arabic):', ayah1?.AyahTextAr);

  const ayah0En = await db.get('SELECT * FROM en_yusufali WHERE sura = 2 AND aya = 0');
  console.log('Ayah 0 (English):', ayah0En?.text);

  const ayah0Bn = await db.get('SELECT * FROM bn_bengali WHERE sura = 2 AND aya = 0');
  console.log('Ayah 0 (Bengali):', ayah0Bn?.text);

  console.log('--- Verifying Surah 1 (Al-Fatihah) ---');
  const s1a1 = await db.get('SELECT * FROM quranar WHERE SuraIDAr = 1 AND VerseIDAr = 1');
  console.log('Surah 1 Ayah 1:', s1a1?.AyahTextAr);
  
  const s1a0 = await db.get('SELECT * FROM quranar WHERE SuraIDAr = 1 AND VerseIDAr = 0');
  console.log('Surah 1 Ayah 0 (should be undefined):', s1a0);

  console.log('--- Verifying Surah 9 (At-Tawbah) ---');
  const s9a0 = await db.get('SELECT * FROM quranar WHERE SuraIDAr = 9 AND VerseIDAr = 0');
  console.log('Surah 9 Ayah 0 (should be undefined):', s9a0);

  await db.close();
}

verifyRestructuring().catch(console.error);
