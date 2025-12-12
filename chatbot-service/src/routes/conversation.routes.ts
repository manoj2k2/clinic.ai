import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * @swagger
 * /api/conversations/{sessionId}:
 *   get:
 *     summary: Get conversation history
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Conversation history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const data = await ChatService.getConversationHistory(sessionId);
  
  res.json({
    success: true,
    ...data
  });
}));

/**
 * @swagger
 * /api/conversations/{sessionId}:
 *   delete:
 *     summary: End a conversation
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation ended
 */
router.delete('/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await ChatService.endConversation(sessionId);
  
  res.json({
    success: true,
    ...result
  });
}));

/**
 * @swagger
 * /api/patients/{patientId}/conversations:
 *   get:
 *     summary: Get patient's conversation history
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of conversations to return
 *     responses:
 *       200:
 *         description: Patient history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 patientId:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 */
router.get('/patients/:patientId', asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const result = await ChatService.getPatientHistory(patientId, limit);
  
  res.json({
    success: true,
    ...result
  });
}));

/**
 * @swagger
 * /api/conversations/stats:
 *   get:
 *     summary: Get conversation statistics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await ChatService.getStats();
  
  res.json({
    success: true,
    ...stats
  });
}));

export default router;
