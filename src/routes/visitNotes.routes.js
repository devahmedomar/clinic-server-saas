import { Router } from 'express';
import { Types } from 'mongoose';
import VisitNote from '../models/VisitNote.js';
import MediaItem from '../models/MediaItem.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { requireAuth, requireRole, enforceSubscriptionAccess } from '../middleware/auth.js';
import { ownedBy, tenanted } from '../utils/tenancy.js';

const router = Router();
router.use(requireAuth, enforceSubscriptionAccess);

const WRITERS = ['clinicAdmin', 'doctor', 'receptionist'];

// List visit notes for a patient (FR-6 timeline)
router.get('/', async (req, res, next) => {
  try {
    const { patientId } = req.query;
    const cond = patientId ? { patientId } : {};
    const notes = await tenanted.find(VisitNote, req, cond).sort({ createdAt: 1 }).limit(500);

    const media = await tenanted.find(MediaItem, req, { visitNoteId: { $in: notes.map((n) => n.id) } });

    const authorIds = [...new Set(notes.map((n) => n.doctorId))];
    const authors = await User.find({ _id: { $in: authorIds }, clinicId: req.user.clinicId });

    const byAuthor = new Map(authors.map((a) => [String(a.id), a.name]));
    const byNote = new Map();
    for (const m of media) {
      const key = String(m.visitNoteId);
      if (!byNote.has(key)) byNote.set(key, []);
      byNote.get(key).push(m);
    }

    res.json({
      notes: notes.map((n) => ({
        id: n.id,
        patientId: n.patientId,
        appointmentId: n.appointmentId,
        createdAt: n.createdAt,
        diagnosis: n.diagnosis,
        prescription: n.prescription,
        notes: n.notes,
        doctorName: byAuthor.get(String(n.doctorId)) || null,
        media: byNote.get(String(n.id)) || [],
      })),
    });
  } catch (err) {
    next(err);
  }
});

// FR-12: create a visit note
router.post('/', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const { patientId, appointmentId, diagnosis = '', prescription = '', notes = '' } = req.body || {};
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const patient = await ownedBy(Patient, req, patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (appointmentId) {
      const appt = await ownedBy(Appointment, req, appointmentId);
      if (!appt || String(appt.patientId) !== String(patientId)) {
        return res.status(400).json({ message: 'Appointment does not belong to this patient' });
      }
    }

    const visitNote = await tenanted.create(VisitNote, req, {
      patientId,
      appointmentId: appointmentId || undefined,
      doctorId: req.user.id,
      diagnosis,
      prescription,
      notes,
    });
    res.status(201).json({ visitNote });
  } catch (err) {
    next(err);
  }
});

// Edit (doctor or clinic admin)
router.put('/:id', requireRole('clinicAdmin', 'doctor'), async (req, res, next) => {
  try {
    const note = await ownedBy(VisitNote, req, req.params.id);
    if (!note) return res.status(404).json({ message: 'Visit note not found' });
    const { diagnosis, prescription, notes } = req.body || {};
    if (diagnosis !== undefined) note.diagnosis = diagnosis;
    if (prescription !== undefined) note.prescription = prescription;
    if (notes !== undefined) note.notes = notes;
    await note.save();
    res.json({ visitNote: note });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('clinicAdmin', 'doctor'), async (req, res, next) => {
  try {
    const note = await ownedBy(VisitNote, req, req.params.id);
    if (!note) return res.status(404).json({ message: 'Visit note not found' });
    await MediaItem.deleteMany({ visitNoteId: note.id });
    await note.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Attach existing media (image/video by id) to a visit note from the patient timeline
router.post('/:id/attach', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const note = await ownedBy(VisitNote, req, req.params.id);
    if (!note) return res.status(404).json({ message: 'Visit note not found' });
    const { mediaId } = req.body || {};
    if (!Types.ObjectId.isValid(mediaId)) return res.status(400).json({ message: 'mediaId required' });

    const checked = await ownedBy(MediaItem, req, mediaId).then((m) => {
      if (m && String(m.patientId) === String(note.patientId) && !m.visitNoteId) return m;
      return null;
    });
    if (!checked) return res.status(400).json({ message: 'Media not found for this patient' });

    checked.visitNoteId = note.id;
    await checked.save();
    res.json({ media: checked });
  } catch (err) {
    next(err);
  }
});

export default router;