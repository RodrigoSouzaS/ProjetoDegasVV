import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

  req.userId = data.user.id;
  req.userRole = data.user.user_metadata?.role ?? 'student';
  next();
}

export function requireTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'teacher') return res.status(403).json({ error: 'Teacher role required' });
  next();
}
