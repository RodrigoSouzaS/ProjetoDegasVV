import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Global top-100 leaderboard
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const [top, myRank] = await Promise.all([
    db.query(
      `SELECT id, username, avatar_url, xp, level,
              ROW_NUMBER() OVER (ORDER BY xp DESC) AS position
       FROM users
       ORDER BY xp DESC
       LIMIT 100`,
    ),
    db.query(
      `SELECT position FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY xp DESC) AS position FROM users
       ) ranked WHERE id = $1`,
      [req.userId],
    ),
  ]);

  res.json({
    ranking: top.rows,
    myPosition: myRank.rows[0]?.position ?? null,
  });
});

// Search users by username
router.get('/search', requireAuth, async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json([]);

  const result = await db.query(
    `SELECT id, username, avatar_url, xp, level,
            ROW_NUMBER() OVER (ORDER BY xp DESC) AS position
     FROM users
     WHERE username ILIKE $1
     LIMIT 20`,
    [`%${q}%`],
  );
  res.json(result.rows);
});

export default router;
