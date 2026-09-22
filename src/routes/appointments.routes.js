import { Router } from 'express';
import { Types } from 'mongoose';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import VisitNote from '../models/VisitNote.js';
import { requireAuth, requireRole, enforceSubscriptionAccess } from '../middleware/auth.js';
import { ownedBy, tenanted } from '../utils/tenancy.js';

const router = Router();
router.use(requireAuth, enforceSubscriptionAccess);

const WRITERS = ['clinicAdmin', 'doctor', 'receptionist'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

async function doctorInClinic(req, doctorId) {
  if (!Types.ObjectId.isValid(doctorId)) return false;
  const doc = await User.findOne({ _id: doctorId, clinicId: req.user.clinicId, role: 'doctor' });
  return !!doc;
}

// FR-9: calendar/day view — appointments filtered by doctor + date
router.get('/', async (req, res, next) => {
  try {
    const { date, doctorId, patientId, from, to } = req.query;
    const cond = {};
    if (date) {
      if (!DATE_RE.test(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
      cond.date = date;
    }
    if (doctorId) cond.doctorId = doctorId;
    if (patientId) cond.patientId = patientId;
    if (from || to) cond.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

    const appointments = await tenanted
      .find(Appointment, req, cond)
      .sort({ date: 1, startsAt: 1 })
      .limit(1000);

    const patientIds = [...new Set(appointments.map((a) => a.patientId))];
    const doctorIds = [...new Set(appointments.map((a) => a.doctorId))];

    const [patients, doctors] = await Promise.all([
      Patient.find({ _id: { $in: patientIds }, clinicId: req.user.clinicId }),
      User.find({ _id: { $in: doctorIds }, clinicId: req.user.clinicId, role: 'doctor' }),
    ]);

    res.json({
      appointments,
      patients: patients.map((p) => ({ id: p.id, name: p.name, phone: p.phone })),
      doctors: doctors.map((d) => ({ id: d.id, name: d.name })),
    });
  } catch (err) {
    next(err);
  }
});

// FR-8: create appointment
router.post('/', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const { patientId, doctorId, date, startsAt, durationMin, status, notes } = req.body || {};
    if (!patientId || !doctorId || !date || !startsAt) {
      return res.status(400).json({ message: 'patientId, doctorId, date, startsAt are required' });
    }
    if (!DATE_RE.test(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    if (!TIME_RE.test(startsAt)) return res.status(400).json({ message: 'startsAt must be HH:mm' });

    const patient = await ownedBy(Patient, req, patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    if (!(await doctorInClinic(req, doctorId))) {
      return res.status(404).json({ message: 'Doctor not found in this clinic' });
    }

    // FR-10: prevent double-booking the same doctor at the same slot
    const clash = await tenanted.find(Appointment, req, {
      doctorId,
      date,
      startsAt,
      status: { $ne: 'cancelled' },
    });
    if (clash.length > 0) {
      return res.status(409).json({ message: 'This doctor is already booked at that time' });
    }

    const appointment = await tenanted.create(Appointment, req, {
      patientId,
      doctorId,
      date,
      startsAt,
      durationMin: durationMin || 20,
      status: ['booked', 'done', 'cancelled', 'no-show'].includes(status) ? status : 'booked',
      notes: notes || '',
    });
    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
});

// FR-8: update status/details
router.put('/:id', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const appointment = await ownedBy(Appointment, req, req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const { status, notes, date, startsAt, doctorId, durationMin, patientId } = req.body || {};

    if (doctorId && doctorId !== String(appointment.doctorId)) {
      if (!(await doctorInClinic(req, doctorId))) {
        return res.status(404).json({ message: 'Doctor not found in this clinic' });
      }
    }

    if (date || startsAt || doctorId || status) {
      const nextDate = date || appointment.date;
      const nextTime = startsAt || appointment.startsAt;
      const nextDoctor = doctorId || appointment.doctorId;
      const nextStatus = status || appointment.status;
      if (!DATE_RE.test(nextDate)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
      if (!TIME_RE.test(nextTime)) return res.status(400).json({ message: 'startsAt must be HH:mm' });

      if (nextStatus !== 'cancelled') {
        const clash = await tenanted.find(Appointment, req, {
          _id: { $ne: appointment.id },
          doctorId: nextDoctor,
          date: nextDate,
          startsAt: nextTime,
          status: { $ne: 'cancelled' },
        });
        if (clash.length > 0) {
          return res.status(409).json({ message: 'This doctor is already booked at that time' });
        }
      }
      appointment.date = nextDate;
      appointment.startsAt = nextTime;
      appointment.doctorId = nextDoctor;
      appointment.status = nextStatus;
    }

    if (notes !== undefined) appointment.notes = notes;
    if (durationMin !== undefined) appointment.durationMin = durationMin;
    if (patientId !== undefined) {
      const patient = await ownedBy(Patient, req, patientId);
      if (!patient) return res.status(404).json({ message: 'Patient not found' });
      appointment.patientId = patientId;
    }
    await appointment.save();
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
});

// FR-12: when an appointment is marked done, Doctor may create a visit note from it
router.post('/:id/visit-note', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const appointment = await ownedBy(Appointment, req, req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const { diagnosis = '', prescription = '', notes = '' } = req.body || {};
    const visitNote = await tenanted.create(VisitNote, req, {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      diagnosis,
      prescription,
      notes,
    });

    if (appointment.status === 'booked') {
      appointment.status = 'done';
      await appointment.save();
    }
    res.status(201).json({ visitNote });
  } catch (err) {
    next(err);
  }
});

export default router;