export const XP = {
  MULTIPLE_CHOICE_CORRECT: 10,
  TYPE_CORRECT: 15,
  TYPE_EXACT_BONUS: 5,
  DAILY_STREAK_BONUS: 20,
  DAILY_GOAL_BONUS: 50,
} as const;

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; percent: number } {
  const level = calculateLevel(xp);
  const prevLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = xpForNextLevel(level);
  const current = xp - prevLevelXp;
  const needed = nextLevelXp - prevLevelXp;
  return { current, needed, percent: Math.round((current / needed) * 100) };
}
