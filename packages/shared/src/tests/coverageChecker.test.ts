import { describe, it, expect } from 'vitest';
import { checkRequirementCoverage, findUncoveredRequirementIds } from '../algorithms/coverageChecker';
import { RoleRequirement, Question } from '../schemas/kit.schema';

describe('CoverageChecker', () => {
  const sampleRequirements: RoleRequirement[] = [
    { id: 'r1', text: 'TypeScript expertise', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node.js performance tuning', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Cross-functional teamwork', kind: 'behavioural', priority: 'nice' },
  ];

  it('reports all requirements covered when every requirement has a matching question', () => {
    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r1', 'r2'], category: 'technical', prompt: 'P1', answer_outline: 'A1', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r3'], category: 'behavioural', prompt: 'P2', answer_outline: 'A2', difficulty: 1 },
    ];

    const result = checkRequirementCoverage(sampleRequirements, questions);

    expect(result.uncovered_requirement_ids).toEqual([]);
    expect(result.covered_requirement_ids).toEqual(['r1', 'r2', 'r3']);
    expect(result.total_requirements).toBe(3);
    expect(result.covered_count).toBe(3);
  });

  it('correctly identifies uncovered requirements in stable original order', () => {
    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r2'], category: 'technical', prompt: 'P1', answer_outline: 'A1', difficulty: 2 },
    ];

    const uncovered = findUncoveredRequirementIds(sampleRequirements, questions);

    expect(uncovered).toEqual(['r1', 'r3']);
  });

  it('handles empty requirements array safely without throwing', () => {
    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'P1', answer_outline: 'A1', difficulty: 1 },
    ];

    const result = checkRequirementCoverage([], questions);

    expect(result.uncovered_requirement_ids).toEqual([]);
    expect(result.total_requirements).toBe(0);
  });

  it('treats all requirements as uncovered when questions array is empty', () => {
    const result = checkRequirementCoverage(sampleRequirements, []);

    expect(result.uncovered_requirement_ids).toEqual(['r1', 'r2', 'r3']);
    expect(result.covered_count).toBe(0);
  });

  it('ignores invalid requirement references that do not exist in requirements list', () => {
    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r1', 'r999_invalid'], category: 'technical', prompt: 'P1', answer_outline: 'A1', difficulty: 1 },
    ];

    const result = checkRequirementCoverage(sampleRequirements, questions);

    expect(result.covered_requirement_ids).toEqual(['r1']);
    expect(result.uncovered_requirement_ids).toEqual(['r2', 'r3']);
  });

  it('preserves stable output ordering matching the input requirements array', () => {
    const reqs: RoleRequirement[] = [
      { id: 'r10', text: 'Req 10', kind: 'technical', priority: 'must' },
      { id: 'r05', text: 'Req 05', kind: 'domain', priority: 'must' },
      { id: 'r01', text: 'Req 01', kind: 'behavioural', priority: 'nice' },
    ];

    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r05'], category: 'domain' as any, prompt: 'P1', answer_outline: 'A1', difficulty: 1 },
    ];

    const uncovered = findUncoveredRequirementIds(reqs, questions);

    expect(uncovered).toEqual(['r10', 'r01']);
  });

  it('handles duplicate requirement IDs in input requirements gracefully without duplicate outputs', () => {
    const duplicateReqs: RoleRequirement[] = [
      { id: 'r1', text: 'TypeScript', kind: 'technical', priority: 'must' },
      { id: 'r1', text: 'TypeScript Duplicate', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Node.js', kind: 'technical', priority: 'must' },
    ];

    const result = checkRequirementCoverage(duplicateReqs, []);

    expect(result.uncovered_requirement_ids).toEqual(['r1', 'r2']);
    expect(result.total_requirements).toBe(2);
  });
});
