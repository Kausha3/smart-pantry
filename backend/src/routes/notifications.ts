import { Router, Response } from 'express';
import db from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  saveSubscription,
  removeSubscription,
  sendNotificationToUser,
  getVapidPublicKey
} from '../services/notifications.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * GET /api/notifications/vapid-public-key - Get VAPID public key for push subscription
 */
router.get('/vapid-public-key', (_req: AuthRequest, res: Response) => {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
    return;
  }

  res.json({ success: true, data: { publicKey } });
});

/**
 * POST /api/notifications/subscribe - Subscribe to push notifications
 */
router.post('/subscribe', (req: AuthRequest, res: Response) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      res.status(400).json({ success: false, error: 'Invalid subscription' });
      return;
    }

    saveSubscription(req.userId!, subscription);

    res.json({ success: true, data: { message: 'Subscribed successfully' } });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
});

/**
 * POST /api/notifications/unsubscribe - Unsubscribe from push notifications
 */
router.post('/unsubscribe', (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({ success: false, error: 'Endpoint required' });
      return;
    }

    removeSubscription(endpoint);

    res.json({ success: true, data: { message: 'Unsubscribed successfully' } });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /api/notifications/test - Send a test notification
 */
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    await sendNotificationToUser(req.userId!, {
      title: 'Test Notification',
      body: 'Push notifications are working correctly!',
      tag: 'test'
    });

    res.json({ success: true, data: { message: 'Test notification sent' } });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send test notification' });
  }
});

/**
 * GET /api/notifications/preferences - Get notification preferences
 */
router.get('/preferences', (req: AuthRequest, res: Response) => {
  try {
    let preferences = db.prepare(`
      SELECT expiry_days_before as expiryDaysBefore,
             daily_summary as dailySummary,
             notify_time as notifyTime,
             enabled
      FROM notification_preferences
      WHERE user_id = ?
    `).get(req.userId);

    if (!preferences) {
      // Return defaults
      preferences = {
        expiryDaysBefore: 3,
        dailySummary: true,
        notifyTime: '09:00',
        enabled: true
      };
    }

    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/notifications/preferences - Update notification preferences
 */
router.put('/preferences', (req: AuthRequest, res: Response) => {
  try {
    const { expiryDaysBefore, dailySummary, notifyTime, enabled } = req.body;

    // Upsert preferences
    db.prepare(`
      INSERT INTO notification_preferences (user_id, expiry_days_before, daily_summary, notify_time, enabled)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        expiry_days_before = COALESCE(?, expiry_days_before),
        daily_summary = COALESCE(?, daily_summary),
        notify_time = COALESCE(?, notify_time),
        enabled = COALESCE(?, enabled)
    `).run(
      req.userId,
      expiryDaysBefore ?? 3,
      dailySummary ?? 1,
      notifyTime ?? '09:00',
      enabled ?? 1,
      expiryDaysBefore,
      dailySummary ? 1 : 0,
      notifyTime,
      enabled ? 1 : 0
    );

    const updated = db.prepare(`
      SELECT expiry_days_before as expiryDaysBefore,
             daily_summary as dailySummary,
             notify_time as notifyTime,
             enabled
      FROM notification_preferences
      WHERE user_id = ?
    `).get(req.userId);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

export default router;
