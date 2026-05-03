import { getDB } from '../../lib/db';
import { Surah, Ayah, SurahDetail, SearchResult } from './quran.types';

export class QuranService {

  /** Get all 114 surahs */
  async getAllSurahs(): Promise<Surah[]> {
    const db = getDB();
    return db.all<Surah[]>(
      'SELECT sura_no, sura_name, para, meaning, total_ayat, total_ruku, eng_name, hindi FROM sura ORDER BY sura_no ASC'
    );
  }

  /** Get a single surah with all its ayahs (joined Arabic, English, Bengali, Audio) */
  async getSurahWithAyahs(surahId: number): Promise<SurahDetail | null> {
    const db = getDB();

    // 1. Fetch surah metadata
    const surah = await db.get<Surah>(
      'SELECT * FROM sura WHERE sura_no = ?',
      surahId
    );
    if (!surah) return null;

    // 2. Fetch ayahs with joined translations
    const ayahs = await db.all<Ayah[]>(
      `SELECT
        ar.SuraIDAr   AS surah_id,
        ar.VerseIDAr  AS ayah_number,
        ar.AyahTextAr AS arabic_text,
        en.text       AS english_text,
        bn.text       AS bengali_text,
        au.audio      AS audio_url
      FROM quranar ar
      LEFT JOIN en_yusufali en ON en.sura = ar.SuraIDAr AND en.aya = ar.VerseIDAr
      LEFT JOIN bn_bengali  bn ON bn.sura = ar.SuraIDAr AND bn.aya = ar.VerseIDAr
      LEFT JOIN audio       au ON au.sura_no = ar.SuraIDAr
      WHERE ar.SuraIDAr = ?
      ORDER BY ar.VerseIDAr ASC`,
      surahId
    );

    return { ...surah, ayahs };
  }

  /** Get a single ayah */
  async getAyah(surahId: number, ayahNumber: number): Promise<Ayah | undefined> {
    const db = getDB();
    return db.get<Ayah>(
      `SELECT
        ar.SuraIDAr   AS surah_id,
        ar.VerseIDAr  AS ayah_number,
        ar.AyahTextAr AS arabic_text,
        en.text       AS english_text,
        bn.text       AS bengali_text,
        au.audio      AS audio_url
      FROM quranar ar
      LEFT JOIN en_yusufali en ON en.sura = ar.SuraIDAr AND en.aya = ar.VerseIDAr
      LEFT JOIN bn_bengali  bn ON bn.sura = ar.SuraIDAr AND bn.aya = ar.VerseIDAr
      LEFT JOIN audio       au ON au.sura_no = ar.SuraIDAr
      WHERE ar.SuraIDAr = ? AND ar.VerseIDAr = ?`,
      surahId,
      ayahNumber
    );
  }

  /** Search ayahs across English and Bengali translations */
  async searchAyahs(query: string, limit = 30): Promise<SearchResult[]> {
    const db = getDB();
    const like = `%${query}%`;

    const englishResults = await db.all<SearchResult[]>(
      `SELECT
        en.sura       AS surah_id,
        s.sura_name   AS surah_name,
        s.eng_name    AS eng_name,
        en.aya        AS ayah_number,
        ar.AyahTextAr AS arabic_text,
        en.text       AS matched_text,
        'english'     AS language
      FROM en_yusufali en
      JOIN sura s    ON s.sura_no  = en.sura
      JOIN quranar ar ON ar.SuraIDAr = en.sura AND ar.VerseIDAr = en.aya
      WHERE en.text LIKE ?
      LIMIT ?`,
      like,
      limit
    );

    const bengaliResults = await db.all<SearchResult[]>(
      `SELECT
        bn.sura       AS surah_id,
        s.sura_name   AS surah_name,
        s.eng_name    AS eng_name,
        bn.aya        AS ayah_number,
        ar.AyahTextAr AS arabic_text,
        bn.text       AS matched_text,
        'bengali'     AS language
      FROM bn_bengali bn
      JOIN sura s    ON s.sura_no  = bn.sura
      JOIN quranar ar ON ar.SuraIDAr = bn.sura AND ar.VerseIDAr = bn.aya
      WHERE bn.text LIKE ?
      LIMIT ?`,
      like,
      limit
    );

    return [...englishResults, ...bengaliResults];
  }
}

export const quranService = new QuranService();
