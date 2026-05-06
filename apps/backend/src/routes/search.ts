import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Full-text search on public decks
router.get('/decks', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const tag = String(req.query.tag ?? '').trim();

  let query: string;
  let params: any[];

  if (q) {
    query = `
      SELECT d.*, u.username AS owner_username
      FROM decks d
      JOIN users u ON u.id = d.owner_id
      WHERE d.is_public = true
        AND to_tsvector('simple', d.name) @@ plainto_tsquery('simple', $1)
      ORDER BY d.student_count DESC, d.updated_at DESC
      LIMIT 30`;
    params = [q];
  } else if (tag) {
    query = `
      SELECT d.*, u.username AS owner_username
      FROM decks d
      JOIN users u ON u.id = d.owner_id
      WHERE d.is_public = true AND $1 = ANY(d.tags)
      ORDER BY d.student_count DESC
      LIMIT 30`;
    params = [tag];
  } else {
    // Trending public decks
    query = `
      SELECT d.*, u.username AS owner_username
      FROM decks d
      JOIN users u ON u.id = d.owner_id
      WHERE d.is_public = true
      ORDER BY d.student_count DESC, d.updated_at DESC
      LIMIT 30`;
    params = [];
  }

  const result = await db.query(query, params);
  res.json(result.rows);
});

export default router;
