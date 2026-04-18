import { Router } from 'express';
import { createClerkClient } from '@clerk/express';
import { User, Subscription, Mission, Resume } from '../models/index.js';
import jwt from 'jsonwebtoken';

const router = Router();

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'jobhunter-admin2026';
const JWT_SECRET = process.env.JWT_SECRET || 'jobhunter-super-secret-admin-key';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── POST /api/admin/login ─────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, success: true });
  }
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// Middleware to verify Admin JWT
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing admin token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Not an admin' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid admin token' });
  }
};

// ── GET /api/admin/stats ──────────────────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [clerkCount, totalMissions, totalResumes, activeSubs, revenueResult] =
      await Promise.all([
        clerk.users.getCount(),
        Mission.countDocuments(),
        Resume.countDocuments(),
        Subscription.countDocuments({ status: 'active' }),
        Subscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, sum: { $sum: '$price' } } },
        ]),
      ]);

    const totalRevenue = revenueResult[0]?.sum || 0;

    res.json({
      totalUsers: clerkCount,
      totalMissions,
      totalResumes,
      activeSubs,
      totalRevenue: totalRevenue / 100,
    });
  } catch (err) {
    console.error('[ADMIN /stats] Clerk failed, falling back:', err.message);
    const [totalUsers, totalMissions, totalResumes, activeSubs, revenueResult] =
      await Promise.all([
        User.countDocuments(),
        Mission.countDocuments(),
        Resume.countDocuments(),
        Subscription.countDocuments({ status: 'active' }),
        Subscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, sum: { $sum: '$price' } } },
        ]),
      ]);

    res.json({
      totalUsers,
      totalMissions,
      totalResumes,
      activeSubs,
      totalRevenue: (revenueResult[0]?.sum || 0) / 100,
    });
  }
});

// ── GET /api/admin/users ──────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // Paginate through ALL Clerk users (no 100-user cap)
    let allClerkUsers = [];
    let offset = 0;
    const batchSize = 100;

    while (true) {
      const batch = await clerk.users.getUserList({
        limit: batchSize,
        offset,
        orderBy: '-created_at',
      });
      allClerkUsers = allClerkUsers.concat(batch.data);
      if (batch.data.length < batchSize) break;
      offset += batchSize;
    }

    // Bulk upsert all Clerk users into MongoDB
    if (allClerkUsers.length > 0) {
      const bulkOps = allClerkUsers.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: {
            $set: {
              email:
                u.emailAddresses?.[0]?.emailAddress || null,
              name:
                [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
              image_url: u.imageUrl || null,
            },
            $setOnInsert: {
              _id: u.id,
              created_at: u.createdAt
                ? new Date(u.createdAt)
                : new Date(),
            },
          },
          upsert: true,
        },
      }));
      await User.bulkWrite(bulkOps);
    }

    // Query all users with their active subscription + counts
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'subscriptions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user_id', '$$userId'] },
                    { $eq: ['$status', 'active'] },
                  ],
                },
              },
            },
            { $sort: { purchased_at: -1 } },
            { $limit: 1 },
          ],
          as: 'activeSub',
        },
      },
      {
        $lookup: {
          from: 'missions',
          localField: '_id',
          foreignField: 'user_id',
          as: 'userMissions',
        },
      },
      {
        $lookup: {
          from: 'resumes',
          localField: '_id',
          foreignField: 'user_id',
          as: 'userResumes',
        },
      },
      { $sort: { created_at: -1 } },
      {
        $project: {
          id: '$_id',
          email: 1,
          name: 1,
          image_url: 1,
          created_at: 1,
          plan_name: { $arrayElemAt: ['$activeSub.plan_name', 0] },
          sub_status: { $arrayElemAt: ['$activeSub.status', 0] },
          price: { $arrayElemAt: ['$activeSub.price', 0] },
          total_missions: { $size: '$userMissions' },
          total_resumes: { $size: '$userResumes' },
        },
      },
    ]);

    res.json({ users });
  } catch (err) {
    console.error('[ADMIN /users] Error:', err.message);
    // Fallback to local DB only
    try {
      const users = await User.find().sort({ created_at: -1 }).lean();
      res.json({
        users: users.map((u) => ({ id: u._id, ...u })),
      });
    } catch (fallbackErr) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
});

export default router;
