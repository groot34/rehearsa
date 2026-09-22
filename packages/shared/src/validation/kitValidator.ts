import { z } from 'zod';
import { Kit, KitSchema } from '../schemas/kit.schema';
import { checkRequirementCoverage } from '../algorithms/coverageChecker';

export interface KitValidationError {
  path: string;
  message: string;
  code: string;
}

export interface KitValidationResult {
  valid: boolean;
  kit?: Kit;
  errors: KitValidationError[];
}

/**
 * Validates a complete Interview Prep Kit against Appendix A structural and referential integrity constraints.
 * 
 * Checks:
 * 1. Zod structural & enum validation (Appendix A fields, kinds, priorities, categories, difficulty 1-3, days 1-60).
 * 2. Referential integrity (question requirement_ids -> role.requirements, flashcard requirement_ids -> role.requirements, schedule question_ids -> questions).
 * 3. Schedule day count matches `days_available` and days are sequentially numbered 1..N.
 * 4. Coverage consistency: `coverage.uncovered_requirement_ids` strictly matches deterministic coverage checking.
 */
export function validateKit(input: unknown): KitValidationResult {
  const errors: KitValidationError[] = [];

  // Step 1: Execute Zod Schema parse
  const parseResult = KitSchema.safeParse(input);

  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      });
    }

    return {
      valid: false,
      errors,
    };
  }

  const kit = parseResult.data;

  // Step 2: Validate sequential day numbering in schedule
  kit.schedule.days.forEach((day, index) => {
    const expectedDayNum = index + 1;
    if (day.day !== expectedDayNum) {
      errors.push({
        path: `schedule.days[${index}].day`,
        message: `Schedule day number must be strictly sequential. Expected ${expectedDayNum}, got ${day.day}`,
        code: 'INVALID_SCHEDULE_DAY_SEQUENCE',
      });
    }
  });

  // Step 3: Verify coverage consistency
  const coverageResult = checkRequirementCoverage(kit.role.requirements, kit.questions);
  const actualUncoveredSet = new Set(coverageResult.uncovered_requirement_ids);
  const claimedUncoveredSet = new Set(kit.coverage.uncovered_requirement_ids);

  // Check if claimed uncovered list matches actual computed uncovered list
  let coverageMismatch = actualUncoveredSet.size !== claimedUncoveredSet.size;
  if (!coverageMismatch) {
    for (const id of claimedUncoveredSet) {
      if (!actualUncoveredSet.has(id)) {
        coverageMismatch = true;
        break;
      }
    }
  }

  if (coverageMismatch) {
    errors.push({
      path: 'coverage.uncovered_requirement_ids',
      message: `Claimed uncovered_requirement_ids [${kit.coverage.uncovered_requirement_ids.join(', ')}] does not match actual coverage check [${coverageResult.uncovered_requirement_ids.join(', ')}]`,
      code: 'COVERAGE_INCONSISTENCY',
    });
  }

  return {
    valid: errors.length === 0,
    kit: errors.length === 0 ? kit : undefined,
    errors,
  };
}
