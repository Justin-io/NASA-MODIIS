/**
 * ALEX AI Intelligence Service — Dual-LLM Orchestration (Groq + Gemini)
 * Primary: Groq (llama-3.3-70b-versatile)
 * Fallback: Gemini (gemini-2.0-flash)
 */

const ALEX_SYSTEM_PROMPT =
  'You are ALEX, an autonomous environmental intelligence system specializing in wildfire incident command and evacuation planning. ' +
  'Your analysis is used by field commanders. Be concise, precise, and actionable. Never speculate beyond provided data.';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FireThreatParams {
  regionId: string;
  hotspotCount?: number;
  frpMw?: number;
  windSpeedKmh?: number;
  humidityPct?: number;
  temperatureC?: number;
  fuelMoisturePct?: number;
  perimeter?: { areaSqKm?: number; perimeterKm?: number };
  additionalContext?: string;
}

export interface FireThreatAnalysis {
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CATASTROPHIC';
  spreadRiskScore: number;        // 0–100
  estimatedSpreadRateKmH: number;
  primaryThreats: string[];
  recommendedActions: string[];
  timeToEscalationHours: number | null;
  confidenceScore: number;        // 0–1
  rawAnalysis: string;
  provider: 'groq' | 'gemini' | 'openrouter';
  generatedAt: string;
}

export interface EvacuationBriefParams {
  regionId: string;
  affectedPopulation?: number;
  vulnerableGroups?: string[];
  availableRoutes?: string[];
  firePosition?: string;
  weatherConditions?: string;
  resourcesAvailable?: string[];
  additionalContext?: string;
}

export interface EvacuationBrief {
  priority: 'IMMEDIATE' | 'URGENT' | 'PRECAUTIONARY' | 'STANDBY';
  evacuationZones: string[];
  primaryRoutes: string[];
  alternateRoutes: string[];
  assemblyPoints: string[];
  specialNeedsProtocol: string;
  estimatedDurationHours: number;
  resourceRequirements: string[];
  communicationPlan: string;
  rawBrief: string;
  provider: 'groq' | 'gemini' | 'openrouter';
  generatedAt: string;
}

export interface IntelligenceReportParams {
  regionId: string;
  incidentId?: string;
  timeRangeHours?: number;
  includeForecasting?: boolean;
  dataSources?: string[];
  additionalContext?: string;
}

export interface IntelligenceReport {
  executiveSummary: string;
  situationalOverview: string;
  threatAssessment: string;
  resourceStatus: string;
  forecastNextHours: string;
  criticalDecisionPoints: string[];
  intelligenceGaps: string[];
  recommendedNextActions: string[];
  classificationLevel: 'UNCLASSIFIED' | 'SENSITIVE' | 'RESTRICTED';
  rawReport: string;
  provider: 'groq' | 'gemini' | 'openrouter';
  generatedAt: string;
}

export interface AiProviderStatus {
  groq: {
    configured: boolean;
    model: string;
    endpoint: string;
    isPrimary: boolean;
    poolSize: number;
  };
  gemini: {
    configured: boolean;
    model: string;
    endpoint: string;
    isPrimary: boolean;
  };
  openrouter: {
    configured: boolean;
    model: string;
    endpoint: string;
    isPrimary: boolean;
  };
  systemPromptVersion: string;
  serviceVersion: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';

function getGroqKeyPool(): string[] {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.groq1,
    process.env.groq2,
    process.env.groq3,
  ].filter(Boolean) as string[];
  // Deduplicate keys in case the same key is in multiple slots
  return Array.from(new Set(keys));
}

let groqPoolIndex = 0;

async function callGroq(userPrompt: string): Promise<string> {
  const pool = getGroqKeyPool();
  if (pool.length === 0) throw new Error('No GROQ API keys configured in environment');

  let lastError: Error | null = null;
  // Try each key in the pool once before failing
  for (let attempt = 0; attempt < pool.length; attempt++) {
    const key = pool[(groqPoolIndex + attempt) % pool.length];
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'User-Agent': 'ALEX-AI-Service/2.8',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: ALEX_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${err.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      // Advance the round-robin index on success
      groqPoolIndex = (groqPoolIndex + attempt + 1) % pool.length;
      return data.choices[0]?.message?.content ?? '';
    } catch (err: any) {
      lastError = err;
      console.warn(`[aiIntelligenceService] Groq key slot ${attempt} failed, trying next:`, err.message);
    }
  }

  throw lastError ?? new Error('All Groq keys in pool failed');
}

async function callGemini(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'ALEX-AI-Service/2.8' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: ALEX_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0]?.content?.parts[0]?.text ?? '';
}

async function callOpenRouter(userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://alex-environmental.gov',
      'X-Title': 'ALEX Incident Command',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: ALEX_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '';
}

/** Calls Groq first; falls back to Gemini; then OpenRouter. Returns [text, provider]. */
async function callWithFallback(prompt: string): Promise<[string, 'groq' | 'gemini' | 'openrouter']> {
  try {
    const text = await callGroq(prompt);
    return [text, 'groq'];
  } catch (groqErr) {
    console.warn('[aiIntelligenceService] Groq failed, falling back to Gemini:', (groqErr as Error).message);
    try {
      const text = await callGemini(prompt);
      return [text, 'gemini'];
    } catch (geminiErr) {
      console.warn('[aiIntelligenceService] Gemini failed, falling back to OpenRouter:', (geminiErr as Error).message);
      try {
        const text = await callOpenRouter(prompt);
        return [text, 'openrouter'];
      } catch (openRouterErr) {
        throw new Error(
          `All 3 AI providers failed. Groq: ${(groqErr as Error).message}. Gemini: ${(geminiErr as Error).message}. OpenRouter: ${(openRouterErr as Error).message}`,
        );
      }
    }
  }
}

/** Safely extracts a JSON block from LLM output. Returns null if not found. */
function extractJson<T>(raw: string): T | null {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

// ─── Service class ────────────────────────────────────────────────────────────

class AiIntelligenceService {
  async analyzeFireThreat(params: FireThreatParams): Promise<FireThreatAnalysis> {
    const prompt = `Analyze the following wildfire threat data and respond with a JSON object inside a markdown code block.

Input data:
${JSON.stringify(params, null, 2)}

Respond ONLY with a JSON object (inside \`\`\`json ... \`\`\`) with these exact keys:
- threatLevel: "LOW"|"MODERATE"|"HIGH"|"EXTREME"|"CATASTROPHIC"
- spreadRiskScore: number 0-100
- estimatedSpreadRateKmH: number
- primaryThreats: string[]
- recommendedActions: string[]
- timeToEscalationHours: number or null
- confidenceScore: number 0-1
- rawAnalysis: string (3-5 sentence summary)`;

    const [raw, provider] = await callWithFallback(prompt);
    const parsed = extractJson<Omit<FireThreatAnalysis, 'provider' | 'generatedAt'>>(raw);

    return {
      threatLevel: parsed?.threatLevel ?? 'MODERATE',
      spreadRiskScore: parsed?.spreadRiskScore ?? 50,
      estimatedSpreadRateKmH: parsed?.estimatedSpreadRateKmH ?? 0,
      primaryThreats: parsed?.primaryThreats ?? [],
      recommendedActions: parsed?.recommendedActions ?? [],
      timeToEscalationHours: parsed?.timeToEscalationHours ?? null,
      confidenceScore: parsed?.confidenceScore ?? 0.5,
      rawAnalysis: parsed?.rawAnalysis ?? raw,
      provider,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateEvacuationBrief(params: EvacuationBriefParams): Promise<EvacuationBrief> {
    const prompt = `Generate an evacuation brief for the following incident data.

Input data:
${JSON.stringify(params, null, 2)}

Respond ONLY with a JSON object (inside \`\`\`json ... \`\`\`) with these exact keys:
- priority: "IMMEDIATE"|"URGENT"|"PRECAUTIONARY"|"STANDBY"
- evacuationZones: string[]
- primaryRoutes: string[]
- alternateRoutes: string[]
- assemblyPoints: string[]
- specialNeedsProtocol: string
- estimatedDurationHours: number
- resourceRequirements: string[]
- communicationPlan: string
- rawBrief: string (concise operational brief paragraph)`;

    const [raw, provider] = await callWithFallback(prompt);
    const parsed = extractJson<Omit<EvacuationBrief, 'provider' | 'generatedAt'>>(raw);

    return {
      priority: parsed?.priority ?? 'STANDBY',
      evacuationZones: parsed?.evacuationZones ?? [],
      primaryRoutes: parsed?.primaryRoutes ?? [],
      alternateRoutes: parsed?.alternateRoutes ?? [],
      assemblyPoints: parsed?.assemblyPoints ?? [],
      specialNeedsProtocol: parsed?.specialNeedsProtocol ?? '',
      estimatedDurationHours: parsed?.estimatedDurationHours ?? 0,
      resourceRequirements: parsed?.resourceRequirements ?? [],
      communicationPlan: parsed?.communicationPlan ?? '',
      rawBrief: parsed?.rawBrief ?? raw,
      provider,
      generatedAt: new Date().toISOString(),
    };
  }

  async synthesizeIntelligenceReport(params: IntelligenceReportParams): Promise<IntelligenceReport> {
    const prompt = `Synthesize a command-level intelligence report for the following incident context.

Input data:
${JSON.stringify(params, null, 2)}

Respond ONLY with a JSON object (inside \`\`\`json ... \`\`\`) with these exact keys:
- executiveSummary: string
- situationalOverview: string
- threatAssessment: string
- resourceStatus: string
- forecastNextHours: string
- criticalDecisionPoints: string[]
- intelligenceGaps: string[]
- recommendedNextActions: string[]
- classificationLevel: "UNCLASSIFIED"|"SENSITIVE"|"RESTRICTED"
- rawReport: string (full narrative report)`;

    const [raw, provider] = await callWithFallback(prompt);
    const parsed = extractJson<Omit<IntelligenceReport, 'provider' | 'generatedAt'>>(raw);

    return {
      executiveSummary: parsed?.executiveSummary ?? '',
      situationalOverview: parsed?.situationalOverview ?? '',
      threatAssessment: parsed?.threatAssessment ?? '',
      resourceStatus: parsed?.resourceStatus ?? '',
      forecastNextHours: parsed?.forecastNextHours ?? '',
      criticalDecisionPoints: parsed?.criticalDecisionPoints ?? [],
      intelligenceGaps: parsed?.intelligenceGaps ?? [],
      recommendedNextActions: parsed?.recommendedNextActions ?? [],
      classificationLevel: parsed?.classificationLevel ?? 'UNCLASSIFIED',
      rawReport: parsed?.rawReport ?? raw,
      provider,
      generatedAt: new Date().toISOString(),
    };
  }

  getProviderStatus(): AiProviderStatus {
    const groqPool = getGroqKeyPool();
    return {
      groq: {
        configured: groqPool.length > 0,
        model: GROQ_MODEL,
        endpoint: GROQ_ENDPOINT,
        isPrimary: true,
        poolSize: groqPool.length,
      },
      gemini: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: GEMINI_MODEL,
        endpoint: GEMINI_ENDPOINT,
        isPrimary: false,
      },
      openrouter: {
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
        endpoint: OPENROUTER_ENDPOINT,
        isPrimary: false,
      },
      systemPromptVersion: '2.8.0',
      serviceVersion: '2.8.0',
    };
  }
}

export const aiIntelligenceService = new AiIntelligenceService();
