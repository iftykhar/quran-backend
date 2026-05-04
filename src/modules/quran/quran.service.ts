import { getDB } from '../../lib/db';
import { Surah, Ayah, SurahDetail, SearchResult } from './quran.types';

export class QuranService {
  private static cache = new Map<string, any>();

  /** Get all 114 surahs */
  async getAllSurahs(): Promise<Surah[]> {
    const cacheKey = 'all_surahs';
    if (QuranService.cache.has(cacheKey)) {
      return QuranService.cache.get(cacheKey);
    }

    const db = getDB();
    const surahs = await db.all<Surah[]>(
      'SELECT sura_no, sura_name, para, meaning, total_ayat, total_ruku, eng_name, hindi FROM sura ORDER BY sura_no ASC'
    );
    
    QuranService.cache.set(cacheKey, surahs);
    return surahs;
  }

  /** Get a single surah with paginated ayahs */
  async getSurahWithAyahs(
    surahId: number, 
    page: number = 1, 
    limit: number = 20
  ): Promise<SurahDetail | null> {
    const cacheKey = `surah_${surahId}_p${page}_l${limit}`;
    if (QuranService.cache.has(cacheKey)) {
      return QuranService.cache.get(cacheKey);
    }

    const db = getDB();

    // 1. Fetch surah metadata (cached separately as it rarely changes)
    const surahCacheKey = `surah_meta_${surahId}`;
    let surah = QuranService.cache.get(surahCacheKey);
    if (!surah) {
      surah = await db.get<Surah>(
        'SELECT * FROM sura WHERE sura_no = ?',
        surahId
      );
      if (surah) QuranService.cache.set(surahCacheKey, surah);
    }
    
    if (!surah) return null;

    // 2. Fetch ayahs with joined translations (paginated)
    const offset = (page - 1) * limit;
    const ayahs = await db.all<Ayah[]>(
      `SELECT
        ar.SuraIDAr   AS sura_no,
        ar.VerseIDAr  AS ayah_no,
        ar.AyahTextAr AS arabic_text,
        en.text       AS english_text,
        bn.text       AS bengali_text,
        au.audio      AS audio_url
      FROM quranar ar
      LEFT JOIN en_yusufali en ON en.sura = ar.SuraIDAr AND en.aya = ar.VerseIDAr
      LEFT JOIN bn_bengali  bn ON bn.sura = ar.SuraIDAr AND bn.aya = ar.VerseIDAr
      LEFT JOIN audio       au ON au.sura_no = ar.SuraIDAr
      WHERE ar.SuraIDAr = ?
      ORDER BY ar.VerseIDAr ASC
      LIMIT ? OFFSET ?`,
      surahId,
      limit,
      offset
    );

    const result = { ...surah, ayahs };
    QuranService.cache.set(cacheKey, result);
    return result;
  }

  /** Get a single ayah */
  async getAyah(surahId: number, ayahNumber: number): Promise<Ayah | undefined> {
    const db = getDB();
    return db.get<Ayah>(
      `SELECT
        ar.SuraIDAr   AS sura_no,
        ar.VerseIDAr  AS ayah_no,
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
