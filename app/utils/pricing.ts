export interface ModelPricing {
  input: number;       // $ per 1M tokens
  cachedInput: number; // $ per 1M tokens
  output: number;      // $ per 1M tokens
}

/**
 * Extracted from GitHub Copilot official pricing docs.
 * (Prices are per 1,000,000 tokens)
 * Thinking tokens are priced as output tokens.
 */
export const PRICING_MAP: Record<string, ModelPricing> = {
  // OpenAI
  'GPT-4.1': { input: 2.00, cachedInput: 0.50, output: 8.00 },
  'GPT-5 mini': { input: 0.25, cachedInput: 0.025, output: 2.00 },
  'GPT-5.2': { input: 1.75, cachedInput: 0.175, output: 14.00 },
  'GPT-5.2-Codex': { input: 1.75, cachedInput: 0.175, output: 14.00 },
  'GPT-5.3-Codex': { input: 1.75, cachedInput: 0.175, output: 14.00 },
  'GPT-5.4': { input: 2.50, cachedInput: 0.25, output: 15.00 },
  'GPT-5.4 mini': { input: 0.75, cachedInput: 0.075, output: 4.50 },
  'GPT-5.4 nano': { input: 0.20, cachedInput: 0.02, output: 1.25 },
  'GPT-5.5': { input: 5.00, cachedInput: 0.50, output: 30.00 },
  'GPT-4o': { input: 2.50, cachedInput: 1.25, output: 10.00 }, // Fallback estimate

  // Anthropic
  'Claude Haiku 4.5': { input: 1.00, cachedInput: 0.10, output: 5.00 },
  'Claude Sonnet 4': { input: 3.00, cachedInput: 0.30, output: 15.00 },
  'Claude Sonnet 4.5': { input: 3.00, cachedInput: 0.30, output: 15.00 },
  'Claude Sonnet 4.6': { input: 3.00, cachedInput: 0.30, output: 15.00 },
  'Claude Opus 4.5': { input: 5.00, cachedInput: 0.50, output: 25.00 },
  'Claude Opus 4.6': { input: 5.00, cachedInput: 0.50, output: 25.00 },
  'Claude Opus 4.7': { input: 5.00, cachedInput: 0.50, output: 25.00 },
  'Claude Opus 4.8': { input: 5.00, cachedInput: 0.50, output: 25.00 },

  // Google
  'Gemini 2.5 Pro': { input: 1.25, cachedInput: 0.125, output: 10.00 },
  'Gemini 3 Flash': { input: 0.50, cachedInput: 0.05, output: 3.00 },
  'Gemini 3.1 Pro': { input: 2.00, cachedInput: 0.20, output: 12.00 },
  'Gemini 3.5 Flash': { input: 1.50, cachedInput: 0.15, output: 9.00 },
  'Gemini 1.5 Pro': { input: 1.25, cachedInput: 0.125, output: 10.00 }, // Fallback estimate
};

export function calculateCost(model: string, inputTokens: number, cachedTokens: number, outputTokens: number, thinkingTokens: number): number {
  const pricing = PRICING_MAP[model];
  if (!pricing) return 0; // Unknown model cost

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const cachedCost = (cachedTokens / 1_000_000) * pricing.cachedInput;
  const outputTokensTotal = outputTokens + thinkingTokens; // thinking tokens priced as output
  const outputCost = (outputTokensTotal / 1_000_000) * pricing.output;

  return inputCost + cachedCost + outputCost;
}
