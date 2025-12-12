import { Router, Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const activeSessionsCount = await SessionService.getActiveCount();
  
  res.json({
    status: 'ok',
    service: 'chatbot-service',
    version: '1.0.0',
    database: 'postgresql',
    aiProvider: process.env.AI_PROVIDER || 'gemini',
    activeSessions: activeSessionsCount,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: Database health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is healthy
 */
router.get('/health/db', asyncHandler(async (req: Request, res: Response) => {
  const { chatbotPool } = require('../database');
  const client = await chatbotPool.connect();
  const result = await client.query('SELECT NOW() as now, current_database() as database');
  client.release();
  
  res.json({
    status: 'ok',
    database: result.rows[0].database,
    timestamp: result.rows[0].now
  });
}));

export default router;
