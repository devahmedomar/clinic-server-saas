import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import MediaItem from '../models/MediaItem.js';
import { requireAuth, requireRole, enforceSubscriptionAccess } from '../middleware/auth.js';
import { ownedBy, tenanted } from '../utils/tenancy.js';
import { parseYouTubeId } from '../utils/media.js';

const router = Router();
router.use(requireAuth, enforceSubscriptionAccess);

const WRITERS = ['clinicAdmin', 'doctor', 'receptionist'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/**
 * FR-13: upload an image to an external free host (ImgBB) and store only the
 * returned URL. The system never persists binary bytes (SRS core cost principle).
 */
router.post('/upload-image', requireRole(...WRITERS), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file (image) is required' });
    const { patientId, visitNoteId } = req.body || {};
    if (!env.imgbbApiKey) {
      return res.status(503).json({
        message: 'Image upload is not configured (IMGBB_API_KEY missing on server)',
        code: 'UPLOAD_NOT_CONFIGURED',
      });
    }

    const form = new FormData();
    form.append('key', env.imgbbApiKey);
    form.append(
      'image',
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname || 'upload.jpg',
    );

    const upstream = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    const payload = await upstream.json();
    if (!upstream.ok || !payload?.data?.url) {
      return res.status(502).json({ message: 'External image host rejected the upload' });
    }

    const media = await tenanted.create(MediaItem, req, {
      patientId: patientId || undefined,
      visitNoteId: visitNoteId || undefined,
      type: 'image',
      url: payload.data.url,
      uploaderId: req.user.id,
    });

    res.status(201).json({
      media,
      url: payload.data.url,
      displayUrl: payload.data.display_url || payload.data.url,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * FR-14: attach a YouTube unlisted video by link — stores only the video ID,
 * which is embedded via iframe. No bytes are ever downloaded.
 */
router.post('/video', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const { url, patientId, visitNoteId } = req.body || {};
    const youtubeId = parseYouTubeId(url);
    if (!youtubeId) return res.status(400).json({ message: 'Invalid YouTube URL' });

    const media = await tenanted.create(MediaItem, req, {
      patientId: patientId || undefined,
      visitNoteId: visitNoteId || undefined,
      type: 'video',
      youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      uploaderId: req.user.id,
    });
    res.status(201).json({ media });
  } catch (err) {
    next(err);
  }
});

// Media timeline for a patient (FR-6)
router.get('/patient/:patientId', async (req, res, next) => {
  try {
    const items = await tenanted
      .find(MediaItem, req, { patientId: req.params.patientId })
      .sort({ createdAt: -1 });
    res.json({ media: items });
  } catch (err) {
    next(err);
  }
});

// Detach / delete a media item
router.delete('/:id', requireRole(...WRITERS), async (req, res, next) => {
  try {
    const media = await ownedBy(MediaItem, req, req.params.id);
    if (!media) return res.status(404).json({ message: 'Media not found' });
    await media.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;