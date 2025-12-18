/**
 * Healthcare Routes
 *
 * API endpoints for healthcare agent functionality
 */

import { Router } from 'express';
import { LangChainHealthcareAgentService } from '../services/langchain-healthcare-agent.service';
import { HealthcareModel } from '../models/healthcare.model';
import { FhirClientService } from '../services/fhir-client.service';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';

const router = Router();

// =====================================================
// Healthcare Agent Endpoints
// =====================================================

/**
 * POST /api/healthcare/chat
 * Process a healthcare-related message
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { message, sessionId, userId, patientId } = req.body;

    if (!message || !sessionId) {
      throw new ValidationError('Message and sessionId are required');
    }

    const healthcareAgent = new LangChainHealthcareAgentService();
    const response = await healthcareAgent.processHealthcareMessage(message, {
      userId,
      sessionId,
      patientId
    });

    res.json({
      success: response.success,
      response: response.response,
      actions: response.actions,
      metadata: response.metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/healthcare/actions/:conversationId
 * Get healthcare actions for a conversation
 */
router.get('/actions/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversationIdNum = parseInt(conversationId);

    if (isNaN(conversationIdNum)) {
      throw new ValidationError('Invalid conversation ID');
    }

    const actions = await HealthcareModel.getActionsByConversation(conversationIdNum);

    res.json({
      conversationId: conversationIdNum,
      actions,
      count: actions.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/healthcare/actions/:actionId/status
 * Update healthcare action status
 */
router.put('/actions/:actionId/status', async (req, res, next) => {
  try {
    const { actionId } = req.params;
    const { status, resolvedAt } = req.body;

    const actionIdNum = parseInt(actionId);
    if (isNaN(actionIdNum)) {
      throw new ValidationError('Invalid action ID');
    }

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      throw new ValidationError('Invalid status. Must be pending, completed, or cancelled');
    }

    const updatedAction = await HealthcareModel.updateActionStatus(
      actionIdNum,
      status,
      resolvedAt ? new Date(resolvedAt) : undefined
    );

    res.json({
      action: updatedAction,
      message: 'Action status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/healthcare/patients/:patientId/screenings
 * Get screening history for a patient
 */
router.get('/patients/:patientId/screenings', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const screenings = await HealthcareModel.getPatientScreeningHistory(patientId);

    res.json({
      patientId,
      screenings,
      count: screenings.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/healthcare/patients/:patientId/appointments
 * Get appointment booking history for a patient
 */
router.get('/patients/:patientId/appointments', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const appointments = await HealthcareModel.getAppointmentHistory(patientId);

    res.json({
      patientId,
      appointments,
      count: appointments.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/healthcare/practitioners
 * Get available practitioners
 */
router.get('/practitioners', async (req, res, next) => {
  try {
    const { specialty } = req.query;

    const healthcareAgent = new LangChainHealthcareAgentService();
    const practitioners = await healthcareAgent.getAvailablePractitioners(
      specialty as string
    );

    res.json({
      practitioners,
      count: practitioners.length,
      specialty: specialty || 'all'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/healthcare/appointments
 * Book an appointment
 */
router.post('/appointments', async (req, res, next) => {
  try {
    const bookingData = req.body;

    if (!bookingData.patientId || !bookingData.reason) {
      throw new ValidationError('Patient ID and reason are required');
    }

    const healthcareAgent = new LangChainHealthcareAgentService();
    const appointment = await healthcareAgent.bookAppointment(bookingData);

    res.json({
      appointment,
      message: 'Appointment booked successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/healthcare/stats
 * Get healthcare statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await HealthcareModel.getHealthcareStats();

    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/healthcare/urgent-actions
 * Get urgent healthcare actions that need attention
 */
router.get('/urgent-actions', async (req, res, next) => {
  try {
    const urgentActions = await HealthcareModel.getUrgentActions();

    res.json({
      actions: urgentActions,
      count: urgentActions.length,
      message: urgentActions.length > 0
        ? `${urgentActions.length} urgent actions require attention`
        : 'No urgent actions at this time'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/healthcare/cleanup
 * Clean up old completed healthcare actions
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const deletedCount = await HealthcareModel.cleanupOldActions();

    res.json({
      message: `Cleaned up ${deletedCount} old healthcare actions`,
      deletedCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;