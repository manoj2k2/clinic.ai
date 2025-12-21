import { Router } from 'express';
import { PractitionerModel } from '../models/practitioner.model';
import { KeycloakAdminService } from '../services/keycloak-admin.service';

const router = Router();
const kc = new KeycloakAdminService();

/**
 * Self-onboard practitioner: attach current IAM user to a single organization
 * Body: { iamUserId: string, fhirPractitionerId: string, fhirOrganizationId: string }
 */
router.post('/self-onboard', async (req, res, next) => {
  try {
    const { iamUserId, fhirPractitionerId, fhirOrganizationId } = req.body || {};
    if (!iamUserId || !fhirPractitionerId || !fhirOrganizationId) {
      return res.status(400).json({ success: false, message: 'iamUserId, fhirPractitionerId and fhirOrganizationId are required' });
    }

    const existing = await PractitionerModel.getMappingByUser(iamUserId);
    if (existing && existing.fhir_organization_id !== fhirOrganizationId) {
      return res.status(409).json({ success: false, message: 'Practitioner already attached to a different organization' });
    }

    const mapping = await PractitionerModel.upsertMapping(iamUserId, fhirPractitionerId, fhirOrganizationId);

    // Assign practitioner role in Keycloak
    const roleAssigned = await kc.assignRealmRoleToUser(iamUserId, 'practitioner');

    return res.json({ success: true, mapping, roleAssigned });
  } catch (err) {
    next(err);
  }
});

/**
 * Get practitioner mapping for a user
 */
router.get('/mapping/:iamUserId', async (req, res, next) => {
  try {
    const { iamUserId } = req.params;
    const mapping = await PractitionerModel.getMappingByUser(iamUserId);
    return res.json({ success: true, mapping });
  } catch (err) {
    next(err);
  }
});

export default router;
