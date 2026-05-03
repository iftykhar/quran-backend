import { connectDB } from '../lib/db';

async function createIndexes() {
  const db = await connectDB();
  console.log('Creating indexes...');

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_en_yusufali_sura_aya ON en_yusufali(sura, aya);
    CREATE INDEX IF NOT EXISTS idx_bn_bengali_sura_aya  ON bn_bengali(sura, aya);
    CREATE INDEX IF NOT EXISTS idx_quranar_sura_verse   ON quranar(SuraIDAr, VerseIDAr);
    CREATE INDEX IF NOT EXISTS idx_audio_sura_no        ON audio(sura_no);
    CREATE INDEX IF NOT EXISTS idx_sura_sura_no         ON sura(sura_no);
    CREATE INDEX IF NOT EXISTS idx_tafsir_sura_ayat     ON tafsir(sura, ayat);
  `);

  console.log('Indexes created successfully.');
  await db.close();
}

createIndexes().catch(console.error);
