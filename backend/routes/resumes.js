import { Router } from 'express';
import Resume from '../models/Resume.js';
import { requireAuth, syncUser, extractUser } from '../middleware/auth.js';

const router = Router();

// ── GET /api/resumes ───────────────────────────────
router.get('/', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const [resumes, total] = await Promise.all([
      Resume.find({ user_id: req.userId })
        .select('-resume_data')
        .sort({ created_at: -1 })
        .skip(offset)
        .limit(limit),
      Resume.countDocuments({ user_id: req.userId }),
    ]);

    res.json({ resumes, total, limit, offset });
  } catch (err) {
    console.error('[GET /resumes]', err.message);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// ── GET /api/resumes/:id ───────────────────────────
router.get('/:id', requireAuth(), extractUser, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json({ resume });
  } catch (err) {
    console.error('[GET /resumes/:id]', err.message);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// ── POST /api/resumes ──────────────────────────────
router.post('/', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const { target_role, template_id, file_format, resume_data, ats_score } = req.body;

    if (!target_role) {
      return res.status(400).json({ error: 'target_role is required' });
    }

    const skillsCount = resume_data?.topSkills?.length || 0;

    const doc = await Resume.create({
      user_id: req.userId,
      target_role,
      template_id: template_id || 'executive',
      file_format: file_format || 'pdf',
      resume_data: resume_data || null,
      ats_score: ats_score || null,
      skills_count: skillsCount,
    });

    res.status(201).json({ id: doc._id, message: 'Resume saved' });
  } catch (err) {
    console.error('[POST /resumes]', err.message);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// ── DELETE /api/resumes/:id ────────────────────────
router.delete('/:id', requireAuth(), extractUser, async (req, res) => {
  try {
    const result = await Resume.findOneAndDelete({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!result) return res.status(404).json({ error: 'Resume not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /resumes/:id]', err.message);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;
