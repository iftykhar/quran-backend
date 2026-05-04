import { getDB } from '../../lib/db';
import { Surah, Ayah, SurahDetail, SearchResult, Juz } from './quran.types';
import { SURAH_METADATA } from './quran.metadata';
import { PAGE_MAP, TOTAL_PAGES } from './page-metadata';

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
    
    // Enrich with metadata
    const enrichedSurahs = surahs.map(s => ({
      ...s,
      revelation_place: SURAH_METADATA[s.sura_no]?.revelation_place || 'Makkah'
    }));

    QuranService.cache.set(cacheKey, enrichedSurahs);
    return enrichedSurahs;
  }

  /** Get all 30 Juz with surah counts */
  async getJuzList(): Promise<Juz[]> {
    const cacheKey = 'juz_list';
    if (QuranService.cache.has(cacheKey)) {
      return QuranService.cache.get(cacheKey);
    }

    const surahs = await this.getAllSurahs();
    const juzMap = new Map<number, Juz>();

    surahs.forEach((surah) => {
      if (!juzMap.has(surah.para)) {
        juzMap.set(surah.para, {
          juz_no: surah.para,
          surah_count: 0,
          first_surah_name: surah.eng_name,
        });
      }
      const juz = juzMap.get(surah.para)!;
      juz.surah_count++;
    });

    const result = Array.from(juzMap.values()).sort((a, b) => a.juz_no - b.juz_no);
    QuranService.cache.set(cacheKey, result);
    return result;
  }

  /** Get a single surah with paginated ayahs */
  async getSurahWithAyahs(
    surahId: number, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ surah: Surah; ayahs: Ayah[] } | null> {
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
      if (surah) {
        surah.revelation_place = SURAH_METADATA[surah.sura_no]?.revelation_place || 'Makkah';
        QuranService.cache.set(surahCacheKey, surah);
      }
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

    const result = { surah, ayahs };
    QuranService.cache.set(cacheKey, result);
    return result;
  }

  /** Get ayahs by Juz (Para) */
  async getJuzWithAyahs(
    juzId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ juz: Juz; ayahs: Ayah[] } | null> {
    const cacheKey = `juz_${juzId}_p${page}_l${limit}`;
    if (QuranService.cache.has(cacheKey)) {
      return QuranService.cache.get(cacheKey);
    }

    const db = getDB();
    const offset = (page - 1) * limit;

    const ayahs = await db.all<Ayah[]>(
      `SELECT
        ar.SuraIDAr   AS sura_no,
        ar.VerseIDAr  AS ayah_no,
        ar.AyahTextAr AS arabic_text,
        en.text       AS english_text,
        bn.text       AS bengali_text,
        au.audio      AS audio_url,
        s.para        AS juz_no
      FROM quranar ar
      JOIN sura s ON s.sura_no = ar.SuraIDAr
      LEFT JOIN en_yusufali en ON en.sura = ar.SuraIDAr AND en.aya = ar.VerseIDAr
      LEFT JOIN bn_bengali  bn ON bn.sura = ar.SuraIDAr AND bn.aya = ar.VerseIDAr
      LEFT JOIN audio       au ON au.sura_no = ar.SuraIDAr
      WHERE s.para = ?
      ORDER BY s.sura_no ASC, ar.VerseIDAr ASC
      LIMIT ? OFFSET ?`,
      juzId,
      limit,
      offset
    );

    if (ayahs.length === 0) return null;

    const juz = {
      juz_no: juzId,
      surah_count: new Set(ayahs.map(a => a.sura_no)).size,
      first_surah_name: "Surah" // Simplified for now
    };

    const result = { juz, ayahs };
    QuranService.cache.set(cacheKey, result);
    return result;
  }

  /** Get ayahs by Mushaf Page using PAGE_MAP */
  async getPageWithAyahs(
    pageId: number,
    _page: number = 1,
    _limit: number = 200
  ): Promise<{ page_no: number; surahs: { sura_no: number; name: string; eng_name: string }[]; ayahs: Ayah[] } | null> {
    const cacheKey = `page_${pageId}`;
    if (QuranService.cache.has(cacheKey)) {
      return QuranService.cache.get(cacheKey);
    }

    const mappings = PAGE_MAP[pageId];
    if (!mappings || mappings.length === 0) return null;

    const db = getDB();

    // Build WHERE clause from page mapping
    const conditions = mappings.map(
      m => `(ar.SuraIDAr = ${m.sura} AND ar.VerseIDAr BETWEEN ${m.startAyah} AND ${m.endAyah})`
    ).join(' OR ');

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
      WHERE ${conditions}
      ORDER BY ar.SuraIDAr ASC, ar.VerseIDAr ASC`
    );

    // Get surah metadata for each surah on this page
    const surahNos = [...new Set(mappings.map(m => m.sura))];
    const surahMeta = await Promise.all(
      surahNos.map(async sNo => {
        const s = await db.get<Surah>('SELECT sura_no, sura_name, eng_name FROM sura WHERE sura_no = ?', sNo);
        return s ? { sura_no: s.sura_no, name: s.sura_name, eng_name: s.eng_name } : { sura_no: sNo, name: '', eng_name: '' };
      })
    );

    const result = { page_no: pageId, surahs: surahMeta, ayahs };
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

  /** Navigation search for Surahs, Juz, and Pages */
  async searchNavigation(query: string): Promise<any[]> {
    const db = getDB();
    const q = query.toLowerCase().trim();
    const results: any[] = [];

    // 1. Search Surahs
    const surahs = await this.getAllSurahs();
    const matchedSurahs = surahs.filter(s => 
      s.eng_name.toLowerCase().includes(q) || 
      s.sura_no.toString() === q
    ).slice(0, 5);

    matchedSurahs.forEach(s => {
      results.push({
        type: 'surah',
        id: s.sura_no,
        title: s.eng_name,
        subtitle: s.meaning,
        arabic: s.sura_name
      });
    });

    // 2. Search Juz
    if (q.startsWith('juz') || q.startsWith('para')) {
      const num = parseInt(q.replace(/\D/g, ''), 10);
      if (num >= 1 && num <= 30) {
        results.push({
          type: 'juz',
          id: num,
          title: `Juz ${num}`,
          subtitle: 'Quran Section'
        });
      }
    } else {
      const num = parseInt(q, 10);
      if (num >= 1 && num <= 30) {
        results.push({
          type: 'juz',
          id: num,
          title: `Juz ${num}`,
          subtitle: 'Quran Section'
        });
      }
    }

    // 3. Search Page
    if (q.startsWith('page') || q.startsWith('pg')) {
      const num = parseInt(q.replace(/\D/g, ''), 10);
      if (num >= 1 && num <= 604) {
        results.push({
          type: 'page',
          id: num,
          title: `Page ${num}`,
          subtitle: 'Mushaf Al-Madina'
        });
      }
    }

    return results;
  }

  /** Get list of all 604 pages with surah metadata */
  async getPageList(): Promise<{ page_no: number; surahs: string[] }[]> {
    const cacheKey = 'page_list';
    if (QuranService.cache.has(cacheKey)) {
      return QuranService.cache.get(cacheKey);
    }

    const db = getDB();
    const allSurahs = await this.getAllSurahs();
    const surahMap = new Map(allSurahs.map(s => [s.sura_no, s.eng_name]));

    const result = [];
    for (let p = 1; p <= TOTAL_PAGES; p++) {
      const mappings = PAGE_MAP[p] || [];
      const surahNames = [...new Set(mappings.map(m => surahMap.get(m.sura) || `Surah ${m.sura}`))];
      result.push({ page_no: p, surahs: surahNames });
    }

    QuranService.cache.set(cacheKey, result);
    return result;
  }
}

export const quranService = new QuranService();
