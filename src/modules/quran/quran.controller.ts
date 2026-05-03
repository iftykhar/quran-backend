import { Request, Response, NextFunction } from 'express';
import { quranService } from './quran.service';

export class QuranController {

  /** GET /api/v1/quran/surahs */
  async getAllSurahs(_req: Request, res: Response, next: NextFunction) {
    try {
      const surahs = await quranService.getAllSurahs();
      res.json({
        success: true,
        count: surahs.length,
        data: surahs,
      });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/v1/quran/surah/:id */
  async getSurah(req: Request, res: Response, next: NextFunction) {
    try {
      const surahId = parseInt(req.params.id, 10);
      if (isNaN(surahId) || surahId < 1 || surahId > 114) {
        res.status(400).json({ success: false, message: 'Invalid surah ID. Must be 1-114.' });
        return;
      }

      const surah = await quranService.getSurahWithAyahs(surahId);
      if (!surah) {
        res.status(404).json({ success: false, message: 'Surah not found.' });
        return;
      }

      res.json({ success: true, data: surah });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/v1/quran/surah/:surahId/ayah/:ayahNumber */
  async getAyah(req: Request, res: Response, next: NextFunction) {
    try {
      const surahId = parseInt(req.params.surahId, 10);
      const ayahNumber = parseInt(req.params.ayahNumber, 10);

      if (isNaN(surahId) || isNaN(ayahNumber)) {
        res.status(400).json({ success: false, message: 'Invalid surah or ayah number.' });
        return;
      }

      const ayah = await quranService.getAyah(surahId, ayahNumber);
      if (!ayah) {
        res.status(404).json({ success: false, message: 'Ayah not found.' });
        return;
      }

      res.json({ success: true, data: ayah });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/v1/quran/search?q=... */
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
        return;
      }

      const results = await quranService.searchAyahs(query.trim());
      res.json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const quranController = new QuranController();
