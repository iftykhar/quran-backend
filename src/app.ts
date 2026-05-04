import cookieParser from "cookie-parser";
import express, { Application } from "express";
import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./middleware/notFound";

import { applySecurity } from "./middleware/security";
import router from "./router";

const app: Application = express();

app.use(express.static("public"));

app.use(express.json());
app.use(cookieParser());

applySecurity(app);

app.use("/api/v1", router);

app.get("/", (_req, res) => {
  res.send("Hey there! Welcome to our API.");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;