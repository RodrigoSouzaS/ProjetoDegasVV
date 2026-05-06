export interface CardProgress {
  repetitions: number;
  easinessFactor: number;
  intervalDays: number;
}

export type CardStatus = 'new' | 'hard' | 'review';

export interface SRSResult extends CardProgress {
  nextReviewDate: Date;
  status: CardStatus;
}

/**
 * SM-2 spaced repetition algorithm.
 * quality: 0 = complete blackout, 5 = perfect response
 */
export function sm2(quality: number, progress: CardProgress): SRSResult {
  if (quality < 0 || quality > 5) throw new Error('quality must be 0-5');

  let { repetitions, easinessFactor, intervalDays } = progress;

  if (quality >= 3) {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easinessFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  easinessFactor = Math.max(
    1.3,
    easinessFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  let status: CardStatus;
  if (repetitions === 0) status = 'hard';
  else if (repetitions === 1 && quality >= 3) status = 'new';
  else status = 'review';

  return { repetitions, easinessFactor, intervalDays, nextReviewDate, status };
}

export const DEFAULT_PROGRESS: CardProgress = {
  repetitions: 0,
  easinessFactor: 2.5,
  intervalDays: 0,
};
