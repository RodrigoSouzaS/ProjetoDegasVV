import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

const CardSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(1000),
  position: z.number().int().min(0).optional(),
});

async function assertDeckOwner(deckId: string, userId: string, res: any): Promise<boolean> {
  const deck = await db.query('SELECT owner_id FROM decks WHERE id = $1', [deckId]);
  if (!deck.rows[0]) { res.status(404).json({ error: 'Deck not found' }); return false; }
  if (deck.rows[0].owner_id !== userId) { res.status(403).json({ error: 'Forbidden' }); return false; }
  return true;
}

// List cards of a deck
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const result = await db.query(
    `SELECT c.*,
            cp.status, cp.next_review_date, cp.repetitions, cp.easiness_factor, cp.interval_days
     FROM cards c
     LEFT JOIN card_progress cp ON cp.card_id = c.id AND cp.user_id = $2
     WHERE c.deck_id = $1
     ORDER BY c.position`,
    [req.params.deckId, req.userId],
  );
  res.json(result.rows);
});

// Add card (owner only)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  if (!(await assertDeckOwner(req.params.deckId, req.userId!, res))) return;

  const body = CardSchema.parse(req.body);
  const maxPos = await db.query(
    'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE deck_id = $1',
    [req.params.deckId],
  );
  const position = body.position ?? maxPos.rows[0].max + 1;

  const result = await db.query(
    'INSERT INTO cards (deck_id, front, back, position) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.params.deckId, body.front, body.back, position],
  );
  res.status(201).json(result.rows[0]);
});

// Update card (owner only)
router.put('/:cardId', requireAuth, async (req: AuthRequest, res) => {
  if (!(await assertDeckOwner(req.params.deckId, req.userId!, res))) return;

  const body = CardSchema.partial().parse(req.body);
  const result = await db.query(
    `UPDATE cards SET front = COALESCE($1, front), back = COALESCE($2, back), position = COALESCE($3, position)
     WHERE id = $4 AND deck_id = $5 RETURNING *`,
    [body.front, body.back, body.position, req.params.cardId, req.params.deckId],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Card not found' });
  res.json(result.rows[0]);
});

// Delete card (owner only)
router.delete('/:cardId', requireAuth, async (req: AuthRequest, res) => {
  if (!(await assertDeckOwner(req.params.deckId, req.userId!, res))) return;

  await db.query('DELETE FROM cards WHERE id = $1 AND deck_id = $2', [
    req.params.cardId,
    req.params.deckId,
  ]);
  res.status(204).send();
});

export default router;
