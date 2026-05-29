import type { MatchResult } from '../types';
import { matchResultLabel } from '../matchResult';

interface Props {
  result: MatchResult;
}

export function MatchBadge({ result }: Props) {
  const variant = result === 'MATCH' ? 'match' : 'no-match';
  return <span className={`match-badge ${variant}`}>{matchResultLabel(result)}</span>;
}
