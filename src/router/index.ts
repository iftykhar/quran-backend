import { Router } from "express";
import quranRouter from "../modules/quran/quran.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/quran",
    route: quranRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
