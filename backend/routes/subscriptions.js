import { Router } from 'express';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { requireAuth, syncUser, extractUser } from '../middleware/auth.js';

const router = Router();

let razorpay = null;

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured');
  }
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

/** Helper: returns a synthetic Closer sub if the user is the demo account */
async function getDemoSub(userId) {
  const demoUserId = process.env.DEMO_TEST_USER_ID;
  const demoEmail = process.env.DEMO_TEST_EMAIL;
  const demoUsername = process.env.DEMO_TEST_USERNAME;
  
  if (!demoUserId && !demoEmail && !demoUsername) return null;

  // Check ID directly first (fastest)
  if (demoUserId && userId === demoUserId) return createDemoObject(userId);

  // Check Email/Username (needs DB lookup)
  if (demoEmail || demoUsername) {
    const user = await User.findById(userId).lean();
    if (user) {
      if (demoEmail && user.email === demoEmail) return createDemoObject(userId);
      if (demoUsername && user.username === demoUsername) return createDemoObject(userId);
    }
  }

  return null;
}

function createDemoObject(userId) {
  return {
    _id: 'demo_bypass',
    user_id: userId,
    plan_name: 'Closer',
    price: 0,
    currency: 'INR',
    status: 'active',
    purchased_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    _demo: true,
  };
}

// ── GET /api/subscriptions ─────────────────────────
router.get('/', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user_id: req.userId })
      .sort({ purchased_at: -1 });

    // Inject demo sub if applicable
    const demoSub = await getDemoSub(req.userId);
    const all = demoSub ? [demoSub, ...subscriptions] : subscriptions;

    res.json({ subscriptions: all });
  } catch (err) {
    console.error('[GET /subscriptions]', err.message);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// ── GET /api/subscriptions/active ──────────────────
router.get('/active', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    // Demo bypass
    const demoSub = await getDemoSub(req.userId);
    if (demoSub) return res.json({ subscription: demoSub });

    const subscription = await Subscription.findOne({
      user_id: req.userId,
      status: 'active',
    }).sort({ purchased_at: -1 });

    res.json({ subscription: subscription || null });
  } catch (err) {
    console.error('[GET /subscriptions/active]', err.message);
    res.status(500).json({ error: 'Failed to fetch active subscription' });
  }
});

// ── POST /api/subscriptions/create-order ───────────
// Server-side Razorpay order creation (production-grade)
router.post('/create-order', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const { plan_name, price } = req.body;

    if (!plan_name || !price) {
      return res.status(400).json({ error: 'plan_name and price are required' });
    }

    const validPlans = { Starter: 999, Hunter: 2999, Closer: 7999 };
    if (!validPlans[plan_name] || validPlans[plan_name] !== price) {
      return res.status(400).json({ error: 'Invalid plan or price' });
    }

    const order = await getRazorpay().orders.create({
      amount: price * 100, // paise
      currency: 'INR',
      receipt: `${req.userId}_${plan_name}_${Date.now()}`,
      notes: {
        user_id: req.userId,
        plan_name,
      },
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[POST /subscriptions/create-order]', err.message);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ── POST /api/subscriptions/verify ─────────────────
// Verify payment signature and activate subscription
router.post('/verify', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const {
      plan_name, price, razorpay_payment_id,
      razorpay_order_id, razorpay_signature,
    } = req.body;

    if (!plan_name || !price || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'All payment fields are required (plan_name, price, razorpay_payment_id, razorpay_order_id, razorpay_signature)',
      });
    }

    // Mandatory signature verification
    const expectedSig = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      console.error('[PAYMENT] Signature mismatch for user:', req.userId);
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Verify the order amount with Razorpay to prevent tampering
    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    const validPlans = { Starter: 999, Hunter: 2999, Closer: 7999 };
    if (order.amount !== validPlans[plan_name] * 100) {
      console.error('[PAYMENT] Amount mismatch:', order.amount, 'vs expected', validPlans[plan_name] * 100);
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    // Calculate expiry based on plan type
    let expiresAt = null;
    if (plan_name !== 'Starter') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      expiresAt = expiry;
    }

    // Deactivate any existing active subscriptions
    await Subscription.updateMany(
      { user_id: req.userId, status: 'active' },
      { $set: { status: 'expired' } }
    );

    const doc = await Subscription.create({
      user_id: req.userId,
      plan_name,
      price: price * 100,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      status: 'active',
      expires_at: expiresAt,
    });

    console.log(`[PAYMENT] ${plan_name} activated for ${req.userId} — ₹${price}`);

    res.status(201).json({
      id: doc._id,
      message: `${plan_name} subscription activated`,
      plan_name,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[POST /subscriptions/verify]', err.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ── PUT /api/subscriptions/:id/cancel ──────────────
router.put('/:id/cancel', requireAuth(), extractUser, async (req, res) => {
  try {
    const result = await Subscription.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId, status: 'active' },
      { $set: { status: 'cancelled' } }
    );

    if (!result) {
      return res.status(404).json({ error: 'Active subscription not found' });
    }

    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (err) {
    console.error('[PUT /subscriptions/cancel]', err.message);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
