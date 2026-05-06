export type CardColor = 'blue' | 'red' | 'green';

export function cardColor(status: string | null | undefined): CardColor {
  if (!status || status === 'new') return 'blue';
  if (status === 'hard') return 'red';
  return 'green';
}

export const COLOR_MAP: Record<CardColor, string> = {
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#22C55E',
};
