import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db/connection';
import { requireAuth, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();

// Generate invite link
router.post('/invite', requireAuth, requireTeacher, async (req: AuthRequest, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  await db.query(
    'INSERT INTO invite_tokens (teacher_id, token) VALUES ($1, $2)',
    [req.userId, token],
  );
  res.status(201).json({ token, inviteUrl: `/join/${token}` });
});

// Student accepts invite
router.post('/join/:token', requireAuth, async (req: AuthRequest, res) => {
  const invite = await db.query(
    `SELECT * FROM invite_tokens WHERE token = $1 AND used = false AND expires_at > NOW()`,
    [req.params.token],
  );
  if (!invite.rows[0]) return res.status(400).json({ error: 'Invalid or expired invite' });

  const { teacher_id } = invite.rows[0];

  await Promise.all([
    db.query(
      'INSERT INTO teacher_students (teacher_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [teacher_id, req.userId],
    ),
    db.query('UPDATE invite_tokens SET used = true WHERE token = $1', [req.params.token]),
  ]);

  res.json({ message: 'Linked to teacher' });
});

// List students
router.get('/students', requireAuth, requireTeacher, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT u.id, u.username, u.avatar_url, u.xp, u.level, u.streak_days, u.last_study_date,
            (SELECT COUNT(*) FROM study_sessions ss WHERE ss.user_id = u.id) AS sessions_count,
            (SELECT COALESCE(SUM(xp_earned), 0) FROM daily_activity da WHERE da.user_id = u.id AND da.activity_date >= NOW() - INTERVAL '7 days') AS xp_last_7d
     FROM teacher_students ts
     JOIN users u ON u.id = ts.student_id
     WHERE ts.teacher_id = $1
     ORDER BY u.username`,
    [req.userId],
  );
  res.json(result.rows);
});

// Get one student's activity detail
router.get('/students/:studentId', requireAuth, requireTeacher, async (req: AuthRequest, res) => {
  const linked = await db.query(
    'SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
    [req.userId, req.params.studentId],
  );
  if (!linked.rows[0]) return res.status(403).json({ error: 'Student not linked' });

  const [user, activity] = await Promise.all([
    db.query('SELECT id, username, avatar_url, xp, level, streak_days FROM users WHERE id = $1', [
      req.params.studentId,
    ]),
    db.query(
      'SELECT activity_date, cards_studied, xp_earned FROM daily_activity WHERE user_id = $1 ORDER BY activity_date DESC LIMIT 30',
      [req.params.studentId],
    ),
  ]);

  res.json({ student: user.rows[0], activity: activity.rows });
});

// Send feedback
router.post('/feedback', requireAuth, requireTeacher, async (req: AuthRequest, res) => {
  const body = z.object({ studentId: z.string().uuid(), message: z.string().min(1) }).parse(req.body);
  const linked = await db.query(
    'SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2',
    [req.userId, body.studentId],
  );
  if (!linked.rows[0]) return res.status(403).json({ error: 'Student not linked' });

  const result = await db.query(
    'INSERT INTO teacher_feedback (teacher_id, student_id, message) VALUES ($1, $2, $3) RETURNING *',
    [req.userId, body.studentId, body.message],
  );
  res.status(201).json(result.rows[0]);
});

// Assign deck to student
router.post('/assign-deck', requireAuth, requireTeacher, async (req: AuthRequest, res) => {
  const body = z
    .object({ studentId: z.string().uuid(), deckId: z.string().uuid() })
    .parse(req.body);

  const [linked, ownsDeck] = await Promise.all([
    db.query('SELECT 1 FROM teacher_students WHERE teacher_id = $1 AND student_id = $2', [
      req.userId, body.studentId,
    ]),
    db.query('SELECT 1 FROM decks WHERE id = $1 AND owner_id = $2', [body.deckId, req.userId]),
  ]);
  if (!linked.rows[0]) return res.status(403).json({ error: 'Student not linked' });
  if (!ownsDeck.rows[0]) return res.status(403).json({ error: 'You do not own this deck' });

  await db.query(
    'INSERT INTO deck_assignments (teacher_id, student_id, deck_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [req.userId, body.studentId, body.deckId],
  );
  res.status(201).json({ message: 'Deck assigned' });
});

// Student: get feedback received
router.get('/my-feedback', requireAuth, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT tf.*, u.username AS teacher_username, u.avatar_url AS teacher_avatar
     FROM teacher_feedback tf
     JOIN users u ON u.id = tf.teacher_id
     WHERE tf.student_id = $1
     ORDER BY tf.created_at DESC`,
    [req.userId],
  );
  res.json(result.rows);
});

export default router;
