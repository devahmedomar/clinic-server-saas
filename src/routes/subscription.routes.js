import { Router } from 'express';
import { env } from '../config/env.js';
import SubscriptionEvent from '../models/SubscriptionEvent.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { tenanted } from '../utils/tenancy.js';
import { effectiveStatus, ALLOWED_READ_STATUSES } from '../utils/subscription.js';

const router = Router();
router.use(requireAuth, requireRole('clinicAdmin', 'doctor', 'receptionist'));

// Clinic-facing subscription status + zero-cost payment screen (SRS §6.2)
router.get('/', async (req, res, next) => {
  try {
    const status = effectiveStatus(req.clinic);
    const events = await tenanted.find(SubscriptionEvent, req, {}).sort({ createdAt: -1 }).limit(20);

    const confirmLink = `https://wa.me/${env.whatsappNumber}?text=${encodeURIComponent(
      `I have paid ${env.pricePerMonth} ${env.currency} for ${req.clinic.name}`,
    )}`;

    res.json({
      status,
      clinicName: req.clinic.name,
      trialEndsAt: req.clinic.trialEndsAt,
      nextDueDate: req.clinic.nextDueDate,
      graceEndsAt: req.clinic.graceEndsAt,
      pricePerMonth: env.pricePerMonth,
      currency: env.currency,
      paymentInstructions: env.paymentInstructions,
      whatsappConfirmLink: confirmLink,
      canWrite: ALLOWED_READ_STATUSES.includes(status),
      events: events.map((e) => ({
        type: e.type,
        amount: e.amount,
        confirmedAt: e.confirmedAt,
        note: e.note,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;