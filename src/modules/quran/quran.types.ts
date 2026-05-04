export interface Surah {
  sura_no: number;
  sura_name: string;       // Bengali name
  para: number;
  meaning: string;         // English meaning
  total_ayat: number;
  total_ruku: number;
  eng_name: string;        // English transliteration
  hindi: string;
  revelation_place?: string;
}

export interface Ayah {
  sura_no: number;
  ayah_no: number;
  arabic_text: string;
  english_text: string | null;
  bengali_text: string | null;
  audio_url: string | null;
}

export interface SurahDetail extends Surah {
  ayahs: Ayah[];
}

export interface Juz {
  juz_no: number;
  surah_count: number;
  first_surah_name: string;
}

export interface JuzDetail extends Juz {
  surahs: Surah[];
}

export interface SearchResult {
  surah_id: number;
  surah_name: string;
  eng_name: string;
  ayah_number: number;
  arabic_text: string;
  matched_text: string;
  language: 'english' | 'bengali';
}
