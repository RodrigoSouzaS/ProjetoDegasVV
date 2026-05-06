import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ZodError } from 'zod';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import deckRoutes from './routes/decks';
import cardRoutes from './routes/cards';
import studyRoutes from './routes/study';
import leaderboardRoutes from './routes/leaderboard';
import searchRoutes from './routes/search';
import teacherRoutes from './routes/teacher';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/decks/:deckId/cards', cardRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/teacher', teacherRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.flatten() });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
