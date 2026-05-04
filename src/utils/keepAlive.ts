import axios from 'axios';
import logger from '../logger';

/**
 * Pings the server's health endpoint to keep it alive during deployment.
 * Runs every 8 minutes by default.
 */
export const startKeepAlive = (serverUrl: string) => {
  if (!serverUrl) {
    logger.warn('SERVER_URL not provided. Keep-alive cron job will not start.');
    return;
  }

  logger.info(`Starting keep-alive cron job. Target: ${serverUrl}/health`);

  // Run every 8 minutes (480,000 ms)
  setInterval(async () => {
    try {
      const response = await axios.get(`${serverUrl}/health`);
      logger.info(`Keep-alive ping successful: ${response.status} ${response.data.status}`);
    } catch (error: any) {
      logger.error(`Keep-alive ping failed: ${error.message}`);
    }
  }, 480000);
};
