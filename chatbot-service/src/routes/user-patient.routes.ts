import { Router, Request, Response } from 'express';
import { UserPatientMappingModel } from '../models/user-patient-mapping.model';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/error.middleware';

const router = Router();

/**
 * @swagger
 * /api/users/{userId}/patients:
 *   get:
 *     summary: Get all patients accessible to a user
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: IAM user ID (from Keycloak token)
 *     responses:
 *       200:
 *         description: List of patient IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 patientIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid user ID
 */
router.get('/:userId/patients', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ValidationError('userId is required');
  }

  const patientIds = await UserPatientMappingModel.getPatientsByUser(userId);

  res.json({
    success: true,
    userId,
    patientIds,
    count: patientIds.length
  });
}));

/**
 * @swagger
 * /api/users/{userId}/patients/primary:
 *   get:
 *     summary: Get the primary patient for a user
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Primary patient ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 primaryPatientId:
 *                   type: string
 *       404:
 *         description: No primary patient found
 */
router.get('/:userId/patients/primary', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ValidationError('userId is required');
  }

  const primaryPatientId = await UserPatientMappingModel.getPrimaryPatient(userId);

  if (!primaryPatientId) {
    throw new NotFoundError('Primary patient');
  }

  res.json({
    success: true,
    userId,
    primaryPatientId
  });
}));

/**
 * @swagger
 * /api/users/{userId}/patients/{patientId}/access:
 *   get:
 *     summary: Check if user has access to a patient
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Access check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 patientId:
 *                   type: string
 *                 hasAccess:
 *                   type: boolean
 */
router.get('/:userId/patients/:patientId/access', asyncHandler(async (req: Request, res: Response) => {
  const { userId, patientId } = req.params;

  const hasAccess = await UserPatientMappingModel.hasAccessToPatient(userId, patientId);

  res.json({
    success: true,
    userId,
    patientId,
    hasAccess
  });
}));

/**
 * @swagger
 * /api/users/{userId}/patients:
 *   post:
 *     summary: Add a patient to user's accessible patients
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: FHIR Patient resource ID
 *               isPrimary:
 *                 type: boolean
 *                 default: true
 *                 description: Set as primary patient
 *     responses:
 *       200:
 *         description: Patient added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 mapping:
 *                   type: object
 */
router.post('/:userId/patients', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { patientId, isPrimary } = req.body;

  if (!userId || !patientId) {
    throw new ValidationError('userId and patientId are required');
  }

  const mapping = await UserPatientMappingModel.addPatientToUser(
    userId,
    patientId,
    isPrimary !== false // Default to true
  );

  res.json({
    success: true,
    message: `Patient ${patientId} added to user ${userId}`,
    mapping
  });
}));

/**
 * @swagger
 * /api/users/{userId}/patients/{patientId}/primary:
 *   put:
 *     summary: Set a patient as primary for a user
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Primary patient updated
 *       403:
 *         description: User does not have access to patient
 */
router.put('/:userId/patients/:patientId/primary', asyncHandler(async (req: Request, res: Response) => {
  const { userId, patientId } = req.params;

  if (!userId || !patientId) {
    throw new ValidationError('userId and patientId are required');
  }

  // Check access first
  const hasAccess = await UserPatientMappingModel.hasAccessToPatient(userId, patientId);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Patient not found or user does not have access'
    });
  }

  await UserPatientMappingModel.setPrimaryPatient(userId, patientId);

  res.json({
    success: true,
    message: `Patient ${patientId} set as primary for user ${userId}`
  });
}));

/**
 * @swagger
 * /api/users/{userId}/patients/{patientId}:
 *   delete:
 *     summary: Remove a patient from user's accessible patients
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient removed successfully
 *       400:
 *         description: Invalid parameters
 */
router.delete('/:userId/patients/:patientId', asyncHandler(async (req: Request, res: Response) => {
  const { userId, patientId } = req.params;

  if (!userId || !patientId) {
    throw new ValidationError('userId and patientId are required');
  }

  await UserPatientMappingModel.removePatientFromUser(userId, patientId);

  res.json({
    success: true,
    message: `Patient ${patientId} removed from user ${userId}`
  });
}));

/**
 * @swagger
 * /api/patients/{patientId}/users:
 *   get:
 *     summary: Get all users who have access to a patient
 *     tags: [User-Patient Mapping]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user IDs with access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 patientId:
 *                   type: string
 *                 userIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: integer
 */
router.get('/patients/:patientId/users', asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;

  if (!patientId) {
    throw new ValidationError('patientId is required');
  }

  const userIds = await UserPatientMappingModel.getUsersForPatient(patientId);

  res.json({
    success: true,
    patientId,
    userIds,
    count: userIds.length
  });
}));

export default router;
