import { Router } from 'express';
import { Subscription, Mission, JobApplication } from '../models/index.js';
import { requireAuth, syncUser, extractUser } from '../middleware/auth.js';

const router = Router();

// ── GET /api/missions ──────────────────────────────
router.get('/', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const [missions, total] = await Promise.all([
      Mission.find({ user_id: req.userId })
        .sort({ created_at: -1 })
        .skip(offset)
        .limit(limit),
      Mission.countDocuments({ user_id: req.userId }),
    ]);

    res.json({ missions, total, limit, offset });
  } catch (err) {
    console.error('[GET /missions]', err.message);
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

// ── POST /api/missions ─────────────────────────────
router.post('/', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const {
      target_role, location, experience, skills,
      salary, work_mode, notice_period, jobs_found, jobs,
    } = req.body;

    if (!target_role) {
      return res.status(400).json({ error: 'target_role is required' });
    }

    // --- Subscription Limit Enforcement ---
    const subscription = await Subscription.findOne({
      user_id: req.userId,
      status: 'active',
    }).sort({ purchased_at: -1 });

    const plan = subscription ? subscription.plan_name : 'Free';
    let maxApplications = 0;
    let usedApplications = 0;

    if (plan === 'Closer') {
      maxApplications = 999999;
    } else if (plan === 'Hunter') {
      maxApplications = 50;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      usedApplications = await JobApplication.countDocuments({
        user_id: req.userId,
        created_at: { $gte: thirtyDaysAgo },
      });
    } else if (plan === 'Starter') {
      maxApplications = 5;
      usedApplications = await JobApplication.countDocuments({
        user_id: req.userId,
      });
    }

    const newJobsCount = Array.isArray(jobs) ? jobs.length : 0;
    if (usedApplications + newJobsCount > maxApplications) {
      return res.status(403).json({
        error: 'Subscription limit exceeded',
        limit: maxApplications,
        used: usedApplications,
        requested: newJobsCount,
        requiresUpgrade: true,
      });
    }

    // Create mission
    const mission = await Mission.create({
      user_id: req.userId,
      target_role,
      location: location || null,
      experience: experience || null,
      skills: skills || null,
      salary: salary || null,
      work_mode: work_mode || null,
      notice_period: notice_period || null,
      jobs_found: jobs_found || 0,
    });

    // Bulk-insert associated jobs
    if (Array.isArray(jobs) && jobs.length > 0) {
      const jobDocs = jobs.map((j) => ({
        mission_id: mission._id,
        user_id: req.userId,
        job_title: j.title || null,
        company: j.company || null,
        location: j.location || null,
        match_score: j.match || null,
        source: j.source || null,
        salary: j.salary || null,
        apply_url: j.applyUrl || null,
        status: j.status || 'applied',
      }));
      await JobApplication.insertMany(jobDocs);
    }

    res.status(201).json({ id: mission._id, message: 'Mission saved' });
  } catch (err) {
    console.error('[POST /missions]', err.message);
    res.status(500).json({ error: 'Failed to save mission' });
  }
});

// ── GET /api/missions/:id ──────────────────────────
router.get('/:id', requireAuth(), extractUser, async (req, res) => {
  try {
    const mission = await Mission.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    const jobs = await JobApplication.find({ mission_id: mission._id })
      .sort({ match_score: -1 });

    res.json({ mission, jobs });
  } catch (err) {
    console.error('[GET /missions/:id]', err.message);
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
});

// ── GET /api/missions/:id/jobs ─────────────────────
router.get('/:id/jobs', requireAuth(), extractUser, async (req, res) => {
  try {
    const jobs = await JobApplication.find({
      mission_id: req.params.id,
      user_id: req.userId,
    }).sort({ match_score: -1 });

    res.json({ jobs });
  } catch (err) {
    console.error('[GET /missions/:id/jobs]', err.message);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ── PUT /api/missions/jobs/:id/status ─────────────
router.put('/jobs/:id/status', requireAuth(), extractUser, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['applied', 'interviewing', 'offered', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { $set: { status } }
    );

    if (!result) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /jobs/:id/status]', err.message);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

export default router;
