import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/schema.js';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

/**
 * POST /api/auth/register - Create a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: 'Email, password, and name are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, name);

    // Create default notification preferences
    db.prepare(`
      INSERT INTO notification_preferences (user_id)
      VALUES (?)
    `).run(userId);

    // Generate token
    const token = generateToken(userId, email);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email: email.toLowerCase(),
          name
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login - Authenticate user and get token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as User | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, created_at
      FROM users WHERE id = ?
    `).get(req.userId) as User | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

/**
 * PUT /api/auth/me - Update current user info
 */
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ success: false, error: 'Current password required to change password' });
        return;
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId) as User;
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);

      if (!isValid) {
        res.status(401).json({ success: false, error: 'Current password is incorrect' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      db.prepare(`
        UPDATE users SET password_hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(passwordHash, req.userId);
    }

    if (name) {
      db.prepare(`
        UPDATE users SET name = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(name, req.userId);
    }

    const updatedUser = db.prepare(`
      SELECT id, email, name FROM users WHERE id = ?
    `).get(req.userId);

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

export default router;
