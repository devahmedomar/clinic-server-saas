import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import SubscriptionEvent from '../models/SubscriptionEvent.js';
import { signToken, requireAuth, requireRole } from '../middleware/auth.js';
import { addDays } from '../utils/subscription.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(authLimiter);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
  return {
    id: u.id,
    clinicId: u.clinicId,
    role: u.role,
    name: u.name,
    email: u.email,
  };
}

// FR-1 / FR-2: register a clinic → creates Tenant + Clinic Admin, starts 30-day trial
router.post('/signup', async (req, res, next) => {
  try {
    const { clinicName, name, email, password, phone } = req.body || {};
    if (!clinicName || !name || !email || !password) {
      return res.status(400).json({ message: 'clinicName, name, email and password are required' });
    }
    if (!emailRe.test(email)) return res.status(400).json({ message: 'Invalid email' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const now = new Date();
    const clinic = await Clinic.create({
      name: clinicName,
      phone,
      email,
      subscriptionStatus: 'trial',
      trialEndsAt: addDays(now, env.trialDays),
    });

    const admin = await User.create({
      clinicId: clinic.id,
      role: 'clinicAdmin',
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      status: 'active',
    });

    clinic.ownerUserId = admin.id;
    await clinic.save();

    await SubscriptionEvent.create({
      clinicId: clinic.id,
      type: 'trial_start',
      amount: 0,
      note: `30-day trial started`,
    });

    res.status(201).json({ token: signToken(admin), user: publicUser(admin), clinic: clinicName });
  } catch (err) {
    next(err);
  }
});

// FR-3: login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.status !== 'active') return res.status(401).json({ message: 'Account not active' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
    clinic: req.clinic ? { id: req.clinic.id, name: req.clinic.name, subscriptionStatus: req.clinicStatus } : null,
  });
});

// FR-4: Clinic Admin invites doctor/receptionist by email; they set a password on first login
router.post('/invite', requireAuth, requireRole('clinicAdmin'), async (req, res, next) => {
  try {
    const { name, email, role } = req.body || {};
    if (!name || !email || !role) return res.status(400).json({ message: 'name, email, role required' });
    if (!['doctor', 'receptionist'].includes(role)) {
      return res.status(400).json({ message: 'role must be doctor or receptionist' });
    }
    if (!emailRe.test(email)) return res.status(400).json({ message: 'Invalid email' });

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user && user.clinicId?.toString() === req.user.clinicId.toString()) {
      return res.status(409).json({ message: 'User already belongs to this clinic' });
    }
    if (user) return res.status(409).json({ message: 'Email already registered to another clinic' });

    const inviteToken = randomBytes(24).toString('hex');
    user = await User.create({
      clinicId: req.user.clinicId,
      role,
      name,
      email,
      inviteToken,
      status: 'invited',
    });

    res.status(201).json({
      inviteToken,
      user: publicUser(user),
      inviteLink: `${env.clientOrigin}/accept-invite?token=${inviteToken}`,
    });
  } catch (err) {
    next(err);
  }
});

// FR-4: invited user sets their own password on first login
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: 'token and password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ inviteToken: token, status: 'invited' });
    if (!user) return res.status(400).json({ message: 'Invalid or expired invite' });

    user.passwordHash = await bcrypt.hash(password, 10);
    user.inviteToken = null;
    user.status = 'active';
    await user.save();

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;