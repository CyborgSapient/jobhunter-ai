import { clerkMiddleware, getAuth, requireAuth, createClerkClient } from '@clerk/express';
import User from '../models/User.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export { clerkMiddleware, requireAuth };

/**
 * After Clerk auth, ensure the user exists in MongoDB with full profile data.
 * If user doesn't exist or is missing email, fetches details from Clerk API.
 */
export async function syncUser(req, _res, next) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return next();

    const existing = await User.findById(userId).lean();

    if (!existing || !existing.email) {
      // Fetch full profile from Clerk API
      const clerkUser = await clerk.users.getUser(userId);

      await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
            username: clerkUser.username || null,
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
            image_url: clerkUser.imageUrl || null,
          },
          $setOnInsert: { _id: userId },
        },
        { upsert: true, new: true }
      );
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.error('[syncUser] Error:', err.message);
    // Don't block the request if sync fails
    const { userId } = getAuth(req);
    req.userId = userId;
    next();
  }
}

/**
 * Extract userId from Clerk auth and 401 if missing.
 */
export function extractUser(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  req.userId = userId;
  next();
}
