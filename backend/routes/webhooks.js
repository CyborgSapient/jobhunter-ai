import { Router } from 'express';
import express from 'express';
import { Webhook } from 'svix';
import { User, Subscription, Resume, Mission, JobApplication } from '../models/index.js';

const router = Router();

/**
 * POST /api/webhooks/clerk
 * Receives Clerk webhook events for user lifecycle (created, updated, deleted).
 * Uses raw body + svix for signature verification.
 */
router.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error('[Webhook] CLERK_WEBHOOK_SECRET not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const svixHeaders = {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    };

    let event;
    try {
      const wh = new Webhook(WEBHOOK_SECRET);
      event = wh.verify(req.body, svixHeaders);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { type, data } = event;

    try {
      if (type === 'user.created' || type === 'user.updated') {
        await User.findOneAndUpdate(
          { _id: data.id },
          {
            $set: {
              email: data.email_addresses?.[0]?.email_address || null,
              name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
              image_url: data.image_url || null,
            },
            $setOnInsert: { _id: data.id },
          },
          { upsert: true, new: true }
        );
        console.log(`[Webhook] ${type}: ${data.id}`);
      }

      if (type === 'user.deleted') {
        const userId = data.id;
        await Promise.all([
          User.findByIdAndDelete(userId),
          Subscription.deleteMany({ user_id: userId }),
          Resume.deleteMany({ user_id: userId }),
          Mission.deleteMany({ user_id: userId }),
          JobApplication.deleteMany({ user_id: userId }),
        ]);
        console.log(`[Webhook] user.deleted: ${userId}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Webhook] Processing error:', err.message);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
