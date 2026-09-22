import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import { effectiveStatus } from '../utils/subscription.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, clinicId: user.clinicId || null, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

/** Verifies the JWT and attaches req.user (+ req.clinic for tenant users). */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Invalid or inactive account' });
    }

    req.user = {
      id: user.id,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    if (req.user.role === 'owner') {
      return next();
    }

    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) return res.status(403).json({ message: 'Clinic not found' });

    req.clinic = clinic;
    req.clinicStatus = effectiveStatus(clinic);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/** Restricts a route to a set of roles. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

/**
 * Subscription gate for clinic-scoped data routes.
 * - locked / cancelled → everything blocked (fully locked)
 * - gracePeriod        → reads allowed, writes blocked (read-only)
 */
export function enforceSubscriptionAccess(req, res, next) {
  if (req.clinicStatus === 'locked' || req.clinicStatus === 'cancelled') {
    return res.status(403).json({
      code: 'SUBSCRIPTION_LOCKED',
      message: 'Clinic subscription is locked',
      status: req.clinicStatus,
    });
  }
  if (req.clinicStatus === 'gracePeriod' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(403).json({
      code: 'SUBSCRIPTION_READONLY',
      message: 'Clinic is read-only until payment is confirmed',
      status: req.clinicStatus,
    });
  }
  next();
}