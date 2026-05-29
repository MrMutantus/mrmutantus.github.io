import type { MatchResult } from './types';

const LABELS: Record<MatchResult, string> = {
  MATCH: 'MATCH ✓',
  NO_MATCH: 'NO MATCH ✗',
  DIFFERENT_WEAPON: 'DIFFERENT WEAPON ✗',
};

export function matchResultLabel(result: MatchResult): string {
  return LABELS[result];
}
