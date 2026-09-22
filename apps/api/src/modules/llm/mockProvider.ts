import { z } from 'zod';
import { ILlmProvider } from './ILlmProvider';

export class MockLlmProvider implements ILlmProvider {
  public name = 'Mock LLM Provider';

  async generateStructuredJson<T>(
    prompt: string,
    _systemInstruction: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    const promptLower = prompt.toLowerCase();

    let mockData: any = {};

    // 1. Role & Requirements Extraction Prompt
    if (
      promptLower.includes('job_description') ||
      promptLower.includes('job description') ||
      promptLower.includes('extract role') ||
      promptLower.includes('role details')
    ) {
      mockData = {
        title: 'Senior Full Stack Engineer',
        seniority: 'Senior',
        responsibilities: [
          'Design and architect high-performance web applications and backend APIs.',
          'Collaborate with product teams to define technical strategy and feature roadmaps.',
          'Optimize database queries and streaming data pipelines for scalability.',
        ],
        requirements: [
          { id: 'r1', text: 'Proficiency with TypeScript and Node.js backend systems', kind: 'technical', priority: 'must' },
          { id: 'r2', text: 'Experience with React, Next.js, and modern CSS frameworks', kind: 'technical', priority: 'must' },
          { id: 'r3', text: 'Database architecture and query performance tuning', kind: 'technical', priority: 'must' },
          { id: 'r4', text: 'Strong ownership and cross-functional leadership', kind: 'behavioural', priority: 'nice' },
        ],
      };
    }
    // 2. Company Brief Research Prompt
    else if (promptLower.includes('company brief') || promptLower.includes('what_they_do')) {
      mockData = {
        summary: 'Leading cloud technology innovator focusing on high-scale enterprise platforms.',
        what_they_do: 'Builds cloud-native web applications, distributed APIs, and scalable enterprise developer tools.',
        sources: ['https://example.com/about'],
      };
    }
    // 3. Pass 2 Targeted Uncovered Requirements Prompt
    else if (promptLower.includes('uncovered requirement') || promptLower.includes('pass 2')) {
      mockData = {
        questions: [
          {
            id: 'q_p2_1',
            requirement_ids: ['r4'],
            category: 'behavioural',
            prompt: 'Describe a situation where you demonstrated strong technical ownership during an incident.',
            answer_outline: 'Explain the incident timeline, root cause investigation, resolution, and post-mortem safeguards.',
            difficulty: 2,
          },
        ],
      };
    }
    // 4. Default Pass 1 Question & Flashcard Generation
    else {
      mockData = {
        questions: [
          {
            id: 'q1',
            requirement_ids: ['r1'],
            category: 'technical',
            prompt: 'How do you handle asynchronous error propagation in Node.js event loops and streams?',
            answer_outline: 'Discuss stream pipelines, unhandled rejection handlers, and backpressure management.',
            difficulty: 2,
          },
          {
            id: 'q2',
            requirement_ids: ['r2'],
            category: 'system-design',
            prompt: 'How would you design a server-rendered Next.js application with efficient caching?',
            answer_outline: 'Cover Server Components, ISR, fetch cache tags, and CDN edge caching strategies.',
            difficulty: 3,
          },
          {
            id: 'q3',
            requirement_ids: ['r3'],
            category: 'technical',
            prompt: 'Explain database indexing strategies for high-volume read vs write operations.',
            answer_outline: 'Compare B-Tree vs Hash indexes, composite index column order, and write-amplification tradeoffs.',
            difficulty: 2,
          },
        ],
        flashcards: [
          {
            id: 'f1',
            front: 'What is Node.js event loop backpressure?',
            back: 'A mechanism that regulates data stream flow when a readable stream produces data faster than a writable stream can consume.',
            requirement_ids: ['r1'],
          },
          {
            id: 'f2',
            front: 'What is the primary benefit of Next.js Server Components?',
            back: 'Zero bundle size on the client for server-only dependencies and direct access to backend data sources.',
            requirement_ids: ['r2'],
          },
        ],
      };
    }

    const validated = schema.safeParse(mockData);
    if (!validated.success) {
      throw new Error(`Mock LLM data failed schema validation: ${validated.error.message}`);
    }

    return validated.data;
  }

  async generateText(prompt: string): Promise<string> {
    return `[Mock Text Response for prompt: ${prompt.slice(0, 50)}...]`;
  }
}
