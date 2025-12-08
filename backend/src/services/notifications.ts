import webpush from 'web-push';
import db from '../db/schema.js';
import type { Ingredient } from '../types/index.js';

// Configure web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@smartpantry.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Save a push subscription for a user
 */
export function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): void {
  const id = crypto.randomUUID();

  // Remove existing subscription with same endpoint
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(subscription.endpoint);

  db.prepare(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
}

/**
 * Remove a push subscription
 */
export function removeSubscription(endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

/**
 * Send notification to a specific user
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  const subscriptions = db.prepare(`
    SELECT * FROM push_subscriptions WHERE user_id = ?
  `).all(userId) as PushSubscription[];

  const notificationPayload = JSON.stringify({
    ...payload,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png'
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        },
        notificationPayload
      );
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      // Remove invalid subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        removeSubscription(sub.endpoint);
      }
      console.error('Push notification error:', error);
    }
  }
}

/**
 * Send expiry notifications to all users with items expiring soon
 */
export async function sendExpiryNotifications(): Promise<void> {
  // Get all users with notification preferences
  const users = db.prepare(`
    SELECT u.id, u.name, np.expiry_days_before, np.enabled
    FROM users u
    LEFT JOIN notification_preferences np ON u.id = np.user_id
    WHERE np.enabled = 1 OR np.enabled IS NULL
  `).all() as { id: string; name: string; expiry_days_before: number; enabled: number }[];

  for (const user of users) {
    const daysBefore = user.expiry_days_before || 3;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBefore);

    const expiringItems = db.prepare(`
      SELECT name, expiry_date
      FROM ingredients
      WHERE user_id = ? AND expiry_date <= ? AND expiry_date >= date('now')
      ORDER BY expiry_date ASC
    `).all(user.id, futureDate.toISOString().split('T')[0]) as { name: string; expiry_date: string }[];

    if (expiringItems.length > 0) {
      const itemNames = expiringItems.slice(0, 3).map(i => i.name).join(', ');
      const moreCount = expiringItems.length > 3 ? ` and ${expiringItems.length - 3} more` : '';

      await sendNotificationToUser(user.id, {
        title: 'Items Expiring Soon!',
        body: `${itemNames}${moreCount} will expire within ${daysBefore} days. Check your pantry!`,
        tag: 'expiry-reminder',
        data: {
          url: '/pantry',
          itemCount: expiringItems.length
        }
      });
    }
  }
}

/**
 * Get VAPID public key for client
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
