import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Doctors for booking + schedule views
router.get('/doctors', requireRole('clinicAdmin', 'doctor', 'receptionist'), async (req, res, next) => {
  try {
    const doctors = await User.find(
      { clinicId: req.user.clinicId, role: 'doctor', status: 'active' },
      'name email role',
    ).sort({ name: 1 });
    res.json({ doctors });
  } catch (err) {
    next(err);
  }
});

// FR-4: clinic admin lists staff & invites
router.get('/', requireRole('clinicAdmin'), async (req, res, next) => {
  try {
    const staff = await User.find(
      { clinicId: req.user.clinicId },
      'name email role status',
    ).sort({ createdAt: 1 });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

export default router;