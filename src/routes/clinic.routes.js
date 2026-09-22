import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import VisitNote from '../models/VisitNote.js';
import { tenanted } from '../utils/tenancy.js';

const router = Router();
router.use(requireAuth);

// Clinic dashboard overview (counts for the day / upcoming)
router.get('/overview', requireRole('clinicAdmin', 'doctor', 'receptionist'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [patients, appointmentsToday, upcoming, notes, doctors] = await Promise.all([
      Patient.countDocuments({ clinicId: req.user.clinicId, archived: false }),
      Appointment.countDocuments({ clinicId: req.user.clinicId, date: today, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({
        clinicId: req.user.clinicId,
        date: { $gte: today },
        status: 'booked',
      }),
      VisitNote.countDocuments({ clinicId: req.user.clinicId }),
      User.countDocuments({ clinicId: req.user.clinicId, role: 'doctor', status: 'active' }),
    ]);
    res.json({
      counts: { patients, appointmentsToday, upcoming, notes, doctors },
      today,
    });
  } catch (err) {
    next(err);
  }
});

export default router;