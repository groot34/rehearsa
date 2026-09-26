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
          { id: 'r5', text: 'System design and architectural patterns', kind: 'technical', priority: 'must' },
          { id: 'r6', text: 'Cloud infrastructure and deployment experience', kind: 'technical', priority: 'must' },
          { id: 'r7', text: 'Team collaboration and communication skills', kind: 'behavioural', priority: 'nice' },
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
    // 3.5. Pass 3 Additional Questions for Minimum Target
    else if (promptLower.includes('additional') || promptLower.includes('pass 3') || promptLower.includes('minimum target')) {
      const additionalMatch = promptLower.match(/(\d+)\s*additional/);
      const additionalCount = additionalMatch ? parseInt(additionalMatch[1], 10) : 5;
      
      const questions = [];
      for (let i = 0; i < additionalCount; i++) {
        const reqId = `r${(i % 4) + 1}`;
        const category = ['technical', 'behavioural', 'system-design', 'company-fit'][i % 4];
        
        questions.push({
          id: `q_p3_${i + 1}`,
          requirement_ids: [reqId],
          category: category as any,
          prompt: `Additional question ${i + 1} for ${category} covering deeper aspects of requirement ${reqId}`,
          answer_outline: `Detailed answer outline for additional question ${i + 1}`,
          difficulty: ((i % 3) + 1) as 1 | 2 | 3,
        });
      }

      mockData = { questions };
    }
    // 4. Default Pass 1 Question & Flashcard Generation
    else {
      // Parse target question count from prompt if present
      let targetQuestionCount = 3;
      const targetMatch = promptLower.match(/(\d+)\s*(?:questions|minimum|target)/);
      if (targetMatch) {
        targetQuestionCount = Math.max(parseInt(targetMatch[1], 10), 1);
      }

      // Generate question array based on target count
      const questions = [];
      for (let i = 0; i < targetQuestionCount; i++) {
        const reqId = `r${(i % 7) + 1}`;
        const category = ['technical', 'behavioural', 'system-design', 'company-fit'][i % 4];
        
        questions.push({
          id: `q${i + 1}`,
          requirement_ids: [reqId],
          category: category as any,
          prompt: `Question ${i + 1} for ${category} covering requirement ${reqId}`,
          answer_outline: `Answer outline for question ${i + 1}`,
          difficulty: ((i % 3) + 1) as 1 | 2 | 3,
        });
      }

      mockData = {
        questions,
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
