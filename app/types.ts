export interface UsageRecord {
  model: string;
  credit_rate: number | null;
  credits: number | null;
  input_tokens: number | null;
  cached_tokens: number | null;
  output_tokens: number | null;
  thinking_tokens: number | null;
  time_taken: number | null;
  [key: string]: any;
}

export function formatTokens(val: number): string {
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(1) + 'M';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(1) + 'k';
  }
  return String(val);
}
