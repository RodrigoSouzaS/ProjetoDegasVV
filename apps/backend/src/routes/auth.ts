import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/connection';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const RegisterSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'teacher']).default('student'),
});

router.post('/register', async (req, res) => {
  const body = RegisterSchema.parse(req.body);

  const existing = await db.query('SELECT id FROM users WHERE username = $1', [body.username]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });

  const { data, error } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { username: body.username, role: body.role },
  });

  if (error) return res.status(400).json({ error: error.message });

  await db.query(
    `INSERT INTO users (id, username, email, role)
     VALUES ($1, $2, $3, $4)`,
    [data.user.id, body.username, body.email, body.role],
  );

  res.status(201).json({ message: 'User created' });
});

// Login is handled client-side via Supabase SDK (email/Google/Apple)
// This endpoint only validates and returns user profile after OAuth
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

  const result = await db.query('SELECT * FROM users WHERE id = $1', [data.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  res.json(result.rows[0]);
});

export default router;
