import { Router } from 'express';
import Patient from '../models/Patient.js';
import { requireAuth, requireRole, enforceSubscriptionAccess } from '../middleware/auth.js';
import { ownedBy, tenanted } from '../utils/tenancy.js';
import { parseJSONTags } from '../utils/forms.js';

const router = Router();
router.use(requireAuth, enforceSubscriptionAccess);

const WRITERS = ['clinicAdmin', 'doctor', 'receptionist'];
const NOTES_OK = ['clinicAdmin', 'doctor', 'receptionist'];

// FR-5 / FR-7: list + search patients (name/phone, client-side fits <500 but we also filter server side)
router.get('/', async (req, res, next) => {
  try {
    const { q, archived = 'false' } = req.query;
    const cond = { archived: archived === 'true' };
    if (q) {
      const re = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      cond.$or = [{ name: re }, { phone: re }];
    }
    const patients = await tenanted.find(Patient, req, cond).sort({ createdAt: -1 }).limit(500);
    res.json({ patients });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const patient = await ownedBy(Patient, req, req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

// FR-5: create
router.post('/', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const { name, phone, dob, gender, notes, tags } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });
    const patient = await tenanted.create(Patient, req, {
      name,
      phone,
      dob: dob || undefined,
      gender: gender || '',
      notes: notes || '',
      tags: parseJSONTags(tags),
    });
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
});

// FR-5: edit
router.put('/:id', requireRole(...NOTES_OK), async (req, res, next) => {
  try {
    const patient = await ownedBy(Patient, req, req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const { name, phone, dob, gender, notes, tags, archived } = req.body || {};
    if (name) patient.name = name;
    if (phone !== undefined) patient.phone = phone;
    if (dob !== undefined) patient.dob = dob || null;
    if (gender !== undefined) patient.gender = gender || '';
    if (notes !== undefined) patient.notes = notes;
    if (tags !== undefined) patient.tags = parseJSONTags(tags);
    if (typeof archived === 'boolean') patient.archived = archived;
    await patient.save();
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

export default router;