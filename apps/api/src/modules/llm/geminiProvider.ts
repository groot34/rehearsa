import axios from 'axios';
import { z } from 'zod';
import { ILlmProvider } from './ILlmProvider';

/**
 * Conservative normalization map for requirement `kind` enum aliases.
 * Maps known semantic aliases for role requirement categories to exact Appendix A values.
 * Unknown or unsupported values are preserved as-is so Zod runtime validation
 * continues to strictly reject them.
 *
 * Mapping rules:
 * - 'leadership', 'communication', 'management', 'mentoring', 'teamwork', 'ownership',
 *   'collaboration', 'interpersonal', 'soft_skills', 'behavioral' -> 'behavioural'
 * - 'tech', 'technical_skills' -> 'technical'
 * - 'domain_knowledge', 'industry' -> 'domain'
 */
export function normalizeRequirementKind(val: string): string {
  if (typeof val !== 'string') return val;
  const clean = val.toLowerCase().replace(/[^a-z_]/g, '');

  const behaviouralAliases = new Set([
    'leadership',
    'communication',
    'management',
    'mentoring',
    'teamwork',
    'ownership',
    'collaboration',
    'interpersonal',
    'soft_skills',
    'softskills',
    'soft',
    'behaviour',
    'behavior',
    'behavioral',
  ]);

  const technicalAliases = new Set([
    'tech',
    'technical_skills',
    'technicalskills',
  ]);

  const domainAliases = new Set([
    'domain_knowledge',
    'domainknowledge',
    'industry',
  ]);

  if (clean === 'technical') return 'technical';
  if (clean === 'behavioural' || clean === 'behavioral') return 'behavioural';
  if (clean === 'domain') return 'domain';

  if (behaviouralAliases.has(clean)) return 'behavioural';
  if (technicalAliases.has(clean)) return 'technical';
  if (domainAliases.has(clean)) return 'domain';

  return val;
}

/**
 * Normalizes common LLM key naming variations (e.g. job_title -> title)
 * and conservative enum value aliases (e.g. leadership -> behavioural for requirement kind).
 * Pure helper function to assist schema validation without mutating original data structures.
 */
export function normalizeLlmJsonKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeLlmJsonKeys);
  const res: any = {};
  for (const [k, v] of Object.entries(obj)) {
    let targetKey = k;
    const lk = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (lk === 'job_title' || lk === 'jobtitle' || lk === 'role_title') targetKey = 'title';
    else if (lk === 'seniority_level' || lk === 'senioritylevel') targetKey = 'seniority';
    else if (lk === 'core_responsibilities' || lk === 'primary_responsibilities') targetKey = 'responsibilities';
    else if (lk === 'prioritized_requirements' || lk === 'core_requirements') targetKey = 'requirements';
    else if (lk === 'category' && (obj.text || obj.description)) targetKey = 'kind';
    else if (lk === 'description' && obj.id) targetKey = 'text';

    let val = v;
    if (targetKey === 'kind' && typeof v === 'string') {
      val = normalizeRequirementKind(v);
    }

    res[targetKey] = normalizeLlmJsonKeys(val);
  }
  return res;
}

export class GeminiProvider implements ILlmProvider {
  public name = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in .env file.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemInstruction}\n\nStrict Output Format Requirement: You MUST respond ONLY with valid JSON matching the requested structure.\n\nPrompt:\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        };

        const res = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          timeout: 25000,
        });

        const candidates = res.data?.candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error('Gemini API returned no response candidates.');
        }

        const rawText = candidates[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error('Gemini API candidate contained empty text.');
        }

        // Clean json markers if present
        const cleanedJson = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        let jsonParsed = JSON.parse(cleanedJson);
        let validated = schema.safeParse(jsonParsed);

        if (!validated.success && typeof jsonParsed === 'object' && jsonParsed !== null) {
          const normalized = normalizeLlmJsonKeys(jsonParsed);
          const revalidated = schema.safeParse(normalized);
          if (revalidated.success) {
            validated = revalidated;
          }
        }

        if (validated.success) {
          return validated.data;
        }

        const issueMsgs = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`Schema validation failed on Gemini response: ${issueMsgs}`);
      } catch (err: any) {
        // Sanitize error message to ensure API key is never exposed
        const safeMessage = (err.message || 'Unknown error').replace(new RegExp(this.apiKey, 'g'), '[REDACTED_API_KEY]');
        lastError = new Error(safeMessage);
        if (attempt === maxAttempts) {
          break;
        }
      }
    }

    throw new Error(`Gemini Provider failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in .env file.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
      },
    };

    try {
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        timeout: 20000,
      });

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini API returned empty text response.');
      }

      return rawText.trim();
    } catch (err: any) {
      const safeMessage = (err.message || 'Unknown error').replace(new RegExp(this.apiKey, 'g'), '[REDACTED_API_KEY]');
      throw new Error(`Gemini generateText failed: ${safeMessage}`);
    }
  }
}
