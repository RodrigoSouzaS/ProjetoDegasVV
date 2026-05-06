import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get own profile + activity heatmap
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const [user, heatmap] = await Promise.all([
    db.query('SELECT * FROM users WHERE id = $1', [req.userId]),
    db.query(
      `SELECT activity_date, cards_studied, xp_earned
       FROM daily_activity WHERE user_id = $1
       ORDER BY activity_date DESC LIMIT 365`,
      [req.userId],
    ),
  ]);
  if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });

  res.json({ ...user.rows[0], heatmap: heatmap.rows });
});

// Update profile
router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const body = z
    .object({ username: z.string().min(3).max(50).optional(), avatarUrl: z.string().url().optional() })
    .parse(req.body);

  if (body.username) {
    const taken = await db.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [body.username, req.userId],
    );
    if (taken.rows.length > 0) return res.status(409).json({ error: 'Username taken' });
  }

  const result = await db.query(
    `UPDATE users
     SET username = COALESCE($1, username), avatar_url = COALESCE($2, avatar_url)
     WHERE id = $3 RETURNING *`,
    [body.username, body.avatarUrl, req.userId],
  );
  res.json(result.rows[0]);
});

// Public user profile
router.get('/:username', async (req, res) => {
  const result = await db.query(
    'SELECT id, username, avatar_url, xp, level, streak_days FROM users WHERE username = $1',
    [req.params.username],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

export default router;
