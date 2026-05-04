import { connectDB } from './src/lib/db';

async function verifyFix() {
  const db = await connectDB();
  
  console.log('--- Verifying Surah 84 (Al-Inshiqaq) ---');
  const surah84 = await db.get('SELECT * FROM sura WHERE sura_no = 84');
  console.log('Surah 84 Name:', surah84.sura_name);

  console.log('--- Verifying Category 1 (Iman) ---');
  const cat1 = await db.get('SELECT * FROM cat_name WHERE id = 1');
  console.log('Category 1 Name:', cat1.name);

  await db.close();
}

verifyFix().catch(console.error);
