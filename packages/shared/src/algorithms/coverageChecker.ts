import { RoleRequirement, Question } from '../schemas/kit.schema';

export interface CoverageResult {
  uncovered_requirement_ids: string[];
  covered_requirement_ids: string[];
  total_requirements: number;
  covered_count: number;
}

/**
 * Calculates requirement coverage deterministically via set difference.
 * 
 * Rules:
 * 1. A requirement is covered if at least one question references its exact `id`.
 * 2. Invalid requirement IDs referenced by questions are ignored for coverage calculation.
 * 3. Uncovered requirement IDs are returned in a stable order matching the input `requirements` array.
 * 4. Empty requirements or questions arrays are handled safely without errors.
 * 5. Duplicate requirement IDs in input are deduplicated safely.
 */
export function checkRequirementCoverage(
  requirements: RoleRequirement[],
  questions: Question[]
): CoverageResult {
  if (!requirements || requirements.length === 0) {
    return {
      uncovered_requirement_ids: [],
      covered_requirement_ids: [],
      total_requirements: 0,
      covered_count: 0,
    };
  }

  // 1. Build a set of unique valid requirement IDs from the input requirements
  const validReqIdSet = new Set<string>();
  const orderedUniqueReqs: RoleRequirement[] = [];

  for (const r of requirements) {
    if (r && typeof r.id === 'string' && r.id.trim() !== '') {
      if (!validReqIdSet.has(r.id)) {
        validReqIdSet.add(r.id);
        orderedUniqueReqs.push(r);
      }
    }
  }

  // 2. Build a set of requirement IDs covered by valid questions
  const coveredReqIdSet = new Set<string>();

  if (questions && questions.length > 0) {
    for (const q of questions) {
      if (q && Array.isArray(q.requirement_ids)) {
        for (const reqId of q.requirement_ids) {
          // Only count references that actually match a valid requirement ID
          if (validReqIdSet.has(reqId)) {
            coveredReqIdSet.add(reqId);
          }
        }
      }
    }
  }

  // 3. Filter requirements into covered and uncovered, maintaining original array order
  const covered_requirement_ids: string[] = [];
  const uncovered_requirement_ids: string[] = [];

  for (const req of orderedUniqueReqs) {
    if (coveredReqIdSet.has(req.id)) {
      covered_requirement_ids.push(req.id);
    } else {
      uncovered_requirement_ids.push(req.id);
    }
  }

  return {
    uncovered_requirement_ids,
    covered_requirement_ids,
    total_requirements: orderedUniqueReqs.length,
    covered_count: covered_requirement_ids.length,
  };
}

/**
 * Convenience helper returning strictly the array of uncovered requirement IDs.
 */
export function findUncoveredRequirementIds(
  requirements: RoleRequirement[],
  questions: Question[]
): string[] {
  return checkRequirementCoverage(requirements, questions).uncovered_requirement_ids;
}
