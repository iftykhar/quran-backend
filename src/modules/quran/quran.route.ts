import { Router } from 'express';
import { quranController } from './quran.controller';

const quranRouter = Router();

quranRouter.get('/surahs', quranController.getAllSurahs);
quranRouter.get('/juz', quranController.getAllJuz);
quranRouter.get('/pages', quranController.getPageList);
quranRouter.get('/surah/:id', quranController.getSurah);
quranRouter.get('/juz/:id', quranController.getJuz);
quranRouter.get('/page/:id', quranController.getPage);
quranRouter.get('/surah/:surahId/ayah/:ayahNumber', quranController.getAyah);
quranRouter.get('/search', quranController.search);
quranRouter.get('/navigation', quranController.getNavigation);

export default quranRouter;
