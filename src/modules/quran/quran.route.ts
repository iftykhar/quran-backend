import { Router } from 'express';
import { quranController } from './quran.controller';

const quranRouter = Router();

quranRouter.get('/surahs', quranController.getAllSurahs);
quranRouter.get('/surah/:id', quranController.getSurah);
quranRouter.get('/surah/:surahId/ayah/:ayahNumber', quranController.getAyah);
quranRouter.get('/search', quranController.search);

export default quranRouter;
