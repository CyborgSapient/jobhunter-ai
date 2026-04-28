import { Router } from 'express';
import { User, Subscription, Resume, Mission, JobApplication } from '../models/index.js';
import { requireAuth, syncUser, extractUser } from '../middleware/auth.js';

const router = Router();

// ── GET /api/users/me ──────────────────────────────
router.get('/me', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ── Demo account bypass ──────────────────────────
    const demoUserId = process.env.DEMO_TEST_USER_ID;
    const demoEmail = process.env.DEMO_TEST_EMAIL;
    const demoUsername = process.env.DEMO_TEST_USERNAME;
    
    const isDemo = (demoUserId && req.userId === demoUserId) || 
                   (demoEmail && user.email === demoEmail) ||
                   (demoUsername && user.username === demoUsername);

    if (isDemo) {
      console.log(`[AUTH] Granting demo bypass for user: ${user.username || user.email || req.userId}`);
      const [total_resumes, total_missions, total_applications] = await Promise.all([
        Resume.countDocuments({ user_id: req.userId }),
        Mission.countDocuments({ user_id: req.userId }),
        JobApplication.countDocuments({ user_id: req.userId }),
      ]);

      return res.json({
        user,
        subscription: {
          _id: 'demo_bypass',
          user_id: req.userId,
          plan_name: 'Closer',
          price: 0,
          status: 'active',
          purchased_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          _demo: true,
        },
        stats: { total_resumes, total_missions, total_applications },
        limits: {
          plan: 'Closer',
          max_applications: 999999,
          used_applications: total_applications,
          can_apply: true,
          _demo: true,
        },
      });
    }
    // ── End demo bypass ──────────────────────────────

    const subscription = await Subscription.findOne({
      user_id: req.userId,
      status: 'active',
    }).sort({ purchased_at: -1 });

    const [total_resumes, total_missions, total_applications] = await Promise.all([
      Resume.countDocuments({ user_id: req.userId }),
      Mission.countDocuments({ user_id: req.userId }),
      JobApplication.countDocuments({ user_id: req.userId }),
    ]);

    const stats = { total_resumes, total_missions, total_applications };

    // Calculate limits based on subscription
    let maxApplications = 0;
    let usedApplications = 0;
    const plan = subscription ? subscription.plan_name : 'Free';

    if (plan === 'Closer') {
      maxApplications = 999999;
      usedApplications = total_applications;
    } else if (plan === 'Hunter') {
      maxApplications = 50;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      usedApplications = await JobApplication.countDocuments({
        user_id: req.userId,
        created_at: { $gte: thirtyDaysAgo },
      });
    } else if (plan === 'Starter') {
      maxApplications = 5;
      usedApplications = total_applications;
    } else {
      usedApplications = total_applications;
    }

    const limits = {
      plan,
      max_applications: maxApplications,
      used_applications: usedApplications,
      can_apply: usedApplications < maxApplications,
    };

    res.json({ user, subscription: subscription || null, stats, limits });
  } catch (err) {
    console.error('[GET /users/me]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/users/me ──────────────────────────────
router.put('/me', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const allowedFields = [
      'email', 'name', 'image_url', 'phone', 'location',
      'current_role', 'target_role', 'experience', 'skills',
      'linkedin', 'github', 'portfolio',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] != null) {
        updates[field] = req.body[field];
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ user: updated });
  } catch (err) {
    console.error('[PUT /users/me]', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── DELETE /api/users/me ───────────────────────────
router.delete('/me', requireAuth(), extractUser, async (req, res) => {
  try {
    await Promise.all([
      User.findByIdAndDelete(req.userId),
      Subscription.deleteMany({ user_id: req.userId }),
      Resume.deleteMany({ user_id: req.userId }),
      Mission.deleteMany({ user_id: req.userId }),
      JobApplication.deleteMany({ user_id: req.userId }),
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /users/me]', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
