import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { db } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const DeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).max(10).default([]),
});

// List user's decks + library
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT d.*, u.username AS owner_username,
            CASE WHEN d.owner_id = $1 THEN true ELSE false END AS is_owner
     FROM decks d
     JOIN users u ON u.id = d.owner_id
     WHERE d.owner_id = $1
        OR d.id IN (SELECT deck_id FROM user_decks WHERE user_id = $1)
        OR d.id IN (SELECT deck_id FROM deck_assignments WHERE student_id = $1)
     ORDER BY d.updated_at DESC`,
    [req.userId],
  );
  res.json(result.rows);
});

// Get a single deck (owner or library member or public)
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT d.*, u.username AS owner_username
     FROM decks d
     JOIN users u ON u.id = d.owner_id
     WHERE d.id = $1
       AND (d.is_public = true OR d.owner_id = $2
            OR EXISTS (SELECT 1 FROM user_decks WHERE deck_id = d.id AND user_id = $2)
            OR EXISTS (SELECT 1 FROM deck_assignments WHERE deck_id = d.id AND student_id = $2))`,
    [req.params.id, req.userId],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Deck not found' });
  res.json(result.rows[0]);
});

// Create deck
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const body = DeckSchema.parse(req.body);
  const result = await db.query(
    `INSERT INTO decks (owner_id, name, description, is_public, tags)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.userId, body.name, body.description ?? null, body.isPublic, body.tags],
  );
  res.status(201).json(result.rows[0]);
});

// Update deck (owner only)
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const body = DeckSchema.partial().parse(req.body);
  const deck = await db.query('SELECT owner_id FROM decks WHERE id = $1', [req.params.id]);
  if (!deck.rows[0]) return res.status(404).json({ error: 'Deck not found' });
  if (deck.rows[0].owner_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const result = await db.query(
    `UPDATE decks
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_public = COALESCE($3, is_public),
         tags = COALESCE($4, tags),
         updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [body.name, body.description, body.isPublic, body.tags, req.params.id],
  );
  res.json(result.rows[0]);
});

// Delete deck (owner only)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const deck = await db.query('SELECT owner_id FROM decks WHERE id = $1', [req.params.id]);
  if (!deck.rows[0]) return res.status(404).json({ error: 'Deck not found' });
  if (deck.rows[0].owner_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  await db.query('DELETE FROM decks WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

// Add deck to library
router.post('/:id/save', requireAuth, async (req: AuthRequest, res) => {
  const deck = await db.query('SELECT id, is_public FROM decks WHERE id = $1', [req.params.id]);
  if (!deck.rows[0]) return res.status(404).json({ error: 'Deck not found' });
  if (!deck.rows[0].is_public) return res.status(403).json({ error: 'Deck is private' });

  await db.query(
    'INSERT INTO user_decks (user_id, deck_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.userId, req.params.id],
  );
  res.status(201).json({ message: 'Added to library' });
});

// Import deck via CSV
router.post('/import/csv', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { name, isPublic } = z
    .object({ name: z.string().min(1), isPublic: z.string().optional() })
    .parse(req.body);

  const csv = req.file.buffer.toString('utf-8');
  const lines = csv.split('\n').filter((l) => l.trim());

  const cards: { front: string; back: string }[] = [];
  for (const line of lines) {
    const [front, back] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    if (front && back) cards.push({ front, back });
  }

  if (cards.length === 0) return res.status(400).json({ error: 'No valid cards found in CSV' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const deck = await client.query(
      `INSERT INTO decks (owner_id, name, is_public) VALUES ($1, $2, $3) RETURNING *`,
      [req.userId, name, isPublic === 'true'],
    );
    const deckId = deck.rows[0].id;

    for (let i = 0; i < cards.length; i++) {
      await client.query(
        'INSERT INTO cards (deck_id, front, back, position) VALUES ($1, $2, $3, $4)',
        [deckId, cards[i].front, cards[i].back, i],
      );
    }
    await client.query('COMMIT');
    res.status(201).json(deck.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

export default router;
