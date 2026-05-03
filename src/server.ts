import http from "http";
import { connectDB } from "./lib/db";
import app from "./app";
import config from "./config";
import logger from "./logger";

async function main() {
  try {
    await connectDB();
    logger.info("SQLite Database connected successfully");

    const httpServer = http.createServer(app);

    httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error: any) {
    logger.error("Server failed to start:", error);
  }
}

main();
