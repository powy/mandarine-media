/**
 * Health Check Routes
 */

import express from 'express';
import os from 'os';

const router = express.Router();

/**
 * GET /api/health - Service health check
 */
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.floor(memory.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.floor(memory.heapTotal / 1024 / 1024), // MB
      rss: Math.floor(memory.rss / 1024 / 1024), // MB
      external: Math.floor(memory.external / 1024 / 1024) // MB
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.floor(os.totalmem() / 1024 / 1024 / 1024), // GB
      freeMemory: Math.floor(os.freemem() / 1024 / 1024 / 1024) // GB
    }
  });
});

export default router;
