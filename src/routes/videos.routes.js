import { Router } from 'express';
import InstructionVideo from '../models/InstructionVideo.js';
import { requireAuth, requireRole, enforceSubscriptionAccess } from '../middleware/auth.js';
import { ownedBy, tenanted } from '../utils/tenancy.js';
import { parseYouTubeId } from '../utils/media.js';

const router = Router();
// Library is readable in grace period (read-only), writes need full access.
router.use(requireAuth);
const WRITERS = ['clinicAdmin', 'doctor'];

// FR-15: shared library of standard instructional videos
router.get('/', async (req, res, next) => {
  try {
    const videos = await tenanted.find(InstructionVideo, req, {}).sort({ createdAt: -1 });
    res.json({ videos });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(...WRITERS), enforceSubscriptionAccess, async (req, res, next) => {
  try {
    const { title, description = '', url } = req.body || {};
    if (!title || !url) return res.status(400).json({ message: 'title and url are required' });
    const youtubeId = parseYouTubeId(url);
    if (!youtubeId) return res.status(400).json({ message: 'Invalid YouTube URL' });

    const video = await tenanted.create(InstructionVideo, req, {
      title,
      description,
      youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      createdBy: req.user.id,
    });
    res.status(201).json({ video });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole(...WRITERS), enforceSubscriptionAccess, async (req, res, next) => {
  try {
    const video = await ownedBy(InstructionVideo, req, req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    await video.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;