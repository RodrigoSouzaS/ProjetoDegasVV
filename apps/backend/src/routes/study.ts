import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { sm2, DEFAULT_PROGRESS } from '../services/srs';
import { XP, calculateLevel } from '../services/xp';

const router = Router();

const StartSessionSchema = z.object({
  deckId: z.string().uuid(),
  mode: z.enum(['flip', 'multiple_choice', 'type']),
});

const AnswerSchema = z.object({
  cardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  mode: z.enum(['flip', 'multiple_choice', 'type']),
  exactMatch: z.boolean().optional(),
});

// Get cards due for study in a deck (SRS queue)
router.get('/due/:deckId', requireAuth, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT c.*, cp.status, cp.next_review_date, cp.repetitions,
            cp.easiness_factor, cp.interval_days
     FROM cards c
     LEFT JOIN card_progress cp ON cp.card_id = c.id AND cp.user_id = $2
     WHERE c.deck_id = $1
       AND (cp.next_review_date IS NULL OR cp.next_review_date <= CURRENT_DATE)
     ORDER BY COALESCE(cp.status, 'new'), c.position`,
    [req.params.deckId, req.userId],
  );
  res.json(result.rows);
});

// Start a study session
router.post('/session', requireAuth, async (req: AuthRequest, res) => {
  const body = StartSessionSchema.parse(req.body);
  const result = await db.query(
    'INSERT INTO study_sessions (user_id, deck_id, mode) VALUES ($1, $2, $3) RETURNING *',
    [req.userId, body.deckId, body.mode],
  );
  res.status(201).json(result.rows[0]);
});

// Submit a card answer → update SRS + award XP
router.post('/answer', requireAuth, async (req: AuthRequest, res) => {
  const body = AnswerSchema.parse(req.body);

  // Load current progress
  const progressResult = await db.query(
    'SELECT * FROM card_progress WHERE user_id = $1 AND card_id = $2',
    [req.userId, body.cardId],
  );
  const current = progressResult.rows[0]
    ? {
        repetitions: progressResult.rows[0].repetitions,
        easinessFactor: progressResult.rows[0].easiness_factor,
        intervalDays: progressResult.rows[0].interval_days,
      }
    : DEFAULT_PROGRESS;

  const srs = sm2(body.quality, current);

  // Upsert SRS progress
  await db.query(
    `INSERT INTO card_progress (user_id, card_id, repetitions, easiness_factor, interval_days, next_review_date, last_quality, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, card_id) DO UPDATE
     SET repetitions = $3, easiness_factor = $4, interval_days = $5,
         next_review_date = $6, last_quality = $7, status = $8, updated_at = NOW()`,
    [
      req.userId, body.cardId,
      srs.repetitions, srs.easinessFactor, srs.intervalDays,
      srs.nextReviewDate, body.quality, srs.status,
    ],
  );

  // Calculate XP earned
  let xpEarned = 0;
  if (body.mode === 'multiple_choice' && body.quality >= 3) xpEarned = XP.MULTIPLE_CHOICE_CORRECT;
  if (body.mode === 'type' && body.quality >= 3) {
    xpEarned = XP.TYPE_CORRECT;
    if (body.exactMatch) xpEarned += XP.TYPE_EXACT_BONUS;
  }

  if (xpEarned > 0) {
    const userResult = await db.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp',
      [xpEarned, req.userId],
    );
    const newXp = userResult.rows[0].xp;
    const newLevel = calculateLevel(newXp);
    await db.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, req.userId]);

    // Update daily activity
    await db.query(
      `INSERT INTO daily_activity (user_id, activity_date, cards_studied, xp_earned)
       VALUES ($1, CURRENT_DATE, 1, $2)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET cards_studied = daily_activity.cards_studied + 1,
                     xp_earned = daily_activity.xp_earned + $2`,
      [req.userId, xpEarned],
    );
  }

  res.json({ srs, xpEarned });
});

// End a study session
router.patch('/session/:sessionId/end', requireAuth, async (req: AuthRequest, res) => {
  const { cardsStudied, xpEarned } = z
    .object({ cardsStudied: z.number().int(), xpEarned: z.number().int() })
    .parse(req.body);

  const result = await db.query(
    `UPDATE study_sessions
     SET ended_at = NOW(), cards_studied = $1, xp_earned = $2
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [cardsStudied, xpEarned, req.params.sessionId, req.userId],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Session not found' });

  // Streak logic
  const user = await db.query('SELECT last_study_date, streak_days FROM users WHERE id = $1', [
    req.userId,
  ]);
  const { last_study_date, streak_days } = user.rows[0];
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let newStreak = streak_days;
  if (last_study_date === yesterday) newStreak = streak_days + 1;
  else if (last_study_date !== today) newStreak = 1;

  await db.query(
    'UPDATE users SET last_study_date = $1, streak_days = $2 WHERE id = $3',
    [today, newStreak, req.userId],
  );

  res.json({ session: result.rows[0], streakDays: newStreak });
});

// Get deck leaderboard
router.get('/leaderboard/:deckId', requireAuth, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT u.id, u.username, u.avatar_url,
            COUNT(cp.card_id) AS cards_studied,
            SUM(ss.xp_earned) AS xp_earned
     FROM study_sessions ss
     JOIN users u ON u.id = ss.user_id
     JOIN card_progress cp ON cp.user_id = ss.user_id
     JOIN cards c ON c.id = cp.card_id AND c.deck_id = ss.deck_id
     WHERE ss.deck_id = $1
     GROUP BY u.id, u.username, u.avatar_url
     ORDER BY xp_earned DESC
     LIMIT 50`,
    [req.params.deckId],
  );
  res.json(result.rows);
});

export default router;
