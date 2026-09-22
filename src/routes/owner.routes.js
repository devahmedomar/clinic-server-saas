import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import SubscriptionEvent from '../models/SubscriptionEvent.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { effectiveStatus, addDays } from '../utils/subscription.js';

const router = Router();
router.use(requireAuth, requireRole('owner'));

const PRICE = env.pricePerMonth;

// FR-16: owner dashboard — every clinic + trial/subscription status
router.get('/clinics', async (req, res, next) => {
  try {
    const clinics = await Clinic.find().sort({ createdAt: -1 });

    const ids = clinics.map((c) => c.id);
    const [userCounts, patientCounts, lastPayments] = await Promise.all([
      User.aggregate([{ $match: { clinicId: { $in: ids } } }, { $group: { _id: '$clinicId', n: { $sum: 1 } } }]),
      Patient.aggregate([{ $match: { clinicId: { $in: ids } } }, { $group: { _id: '$clinicId', n: { $sum: 1 } } }]),
      SubscriptionEvent.aggregate([
        { $match: { clinicId: { $in: ids }, type: 'manual_payment', confirmedAt: { $ne: null } } },
        { $sort: { confirmedAt: -1 } },
        { $group: { _id: '$clinicId', lastPaid: { $first: '$confirmedAt' } } },
      ]),
    ]);

    const uc = new Map(userCounts.map((r) => [String(r._id), r.n]));
    const pc = new Map(patientCounts.map((r) => [String(r._id), r.n]));
    const lp = new Map(lastPayments.map((r) => [String(r._id), r.lastPaid]));

    const result = clinics.map((c) => {
      const status = effectiveStatus(c);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        signupAt: c.createdAt,
        trialEndsAt: c.trialEndsAt,
        nextDueDate: c.nextDueDate,
        status,
        lastPaidAt: lp.get(String(c.id)) || null,
        users: uc.get(String(c.id)) || 0,
        patients: pc.get(String(c.id)) || 0,
      };
    });

    res.json({ clinics: result });
  } catch (err) {
    next(err);
  }
});

// FR-19: MRR = 200 × count(active paying clinics)
router.get('/mrr', async (req, res, next) => {
  try {
    const clinics = await Clinic.find();
    const active = clinics.filter((c) => effectiveStatus(c) === 'active').length;
    res.json({ mrr: PRICE * active, activeClinics: active, pricePerMonth: PRICE, currency: env.currency });
  } catch (err) {
    next(err);
  }
});

// FR-17: confirm a manual payment → extend subscription 30 days
router.post('/clinics/:id/confirm-payment', async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    clinic.subscriptionStatus = 'active';
    clinic.nextDueDate = addDays(new Date(), 30);
    clinic.graceEndsAt = null;
    await clinic.save();

    await SubscriptionEvent.create({
      clinicId: clinic.id,
      type: 'manual_payment',
      amount: PRICE,
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
      note: 'Payment confirmed via manual transfer',
    });

    res.json({ clinic: { id: clinic.id, subscriptionStatus: clinic.subscriptionStatus, nextDueDate: clinic.nextDueDate } });
  } catch (err) {
    next(err);
  }
});

// FR-18: suspend / reactivate a tenant
router.post('/clinics/:id/suspend', async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const status = effectiveStatus(clinic);
    if (status === 'locked' || status === 'cancelled') {
      return res.status(400).json({ message: `Clinic is already ${status}` });
    }
    clinic.subscriptionStatus = 'locked';
    clinic.graceEndsAt = new Date(0);
    await clinic.save();

    await SubscriptionEvent.create({
      clinicId: clinic.id,
      type: 'suspend',
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
      note: 'Suspended by platform owner',
    });
    res.json({ clinic: { id: clinic.id, subscriptionStatus: 'locked' } });
  } catch (err) {
    next(err);
  }
});

router.post('/clinics/:id/reactivate', async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    clinic.subscriptionStatus = 'active';
    clinic.nextDueDate = addDays(new Date(), 30);
    clinic.graceEndsAt = null;
    await clinic.save();

    await SubscriptionEvent.create({
      clinicId: clinic.id,
      type: 'reactivate',
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
      note: 'Re-activated by platform owner',
    });
    res.json({ clinic: { id: clinic.id, subscriptionStatus: 'active', nextDueDate: clinic.nextDueDate } });
  } catch (err) {
    next(err);
  }
});

// Per-clinic detail with recent appointments, revenue log (owner debugging)
router.get('/clinics/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'bad id' });
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const [users, patients, appointments, events] = await Promise.all([
      User.find({ clinicId: clinic.id }, 'name email role status'),
      Patient.countDocuments({ clinicId: clinic.id }),
      Appointment.countDocuments({ clinicId: clinic.id }),
      SubscriptionEvent.find({ clinicId: clinic.id }).sort({ createdAt: -1 }).limit(50),
    ]);

    res.json({
      clinic,
      effectiveStatus: effectiveStatus(clinic),
      users,
      counts: { patients, appointments },
      events,
    });
  } catch (err) {
    next(err);
  }
});

export default router;