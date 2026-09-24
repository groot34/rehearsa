import { Types } from 'mongoose';
import { Kit, KitSummary } from '@rehearsa/shared';
import { KitDocumentModel } from './kit.model';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface KitServiceSuccess<T> {
  success: true;
  data: T;
}

export interface KitServiceFailure {
  success: false;
  code: string;
  message: string;
  statusCode: number;
}

export type KitServiceResult<T> = KitServiceSuccess<T> | KitServiceFailure;

// Confidence level enum
export type QuestionConfidence = 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready';

export const QuestionConfidenceEnum = ['unknown', 'not-ready', 'somewhat-ready', 'ready'] as const;

// Flashcard confidence tier enum
export type FlashcardConfidence = 'easy' | 'medium' | 'hard';

export const FlashcardConfidenceEnum = ['easy', 'medium', 'hard'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a MongoDB document to the public KitSummary shape.
 * Never returns the full kit payload in list responses.
 */
function toKitSummary(doc: {
  _id: unknown;
  kit: Kit;
  createdAt: Date;
  updatedAt: Date;
}): KitSummary {
  return {
    id: String(doc._id),
    role: doc.kit.role?.title ?? 'Unknown Role',
    company: doc.kit.source?.company ?? 'Unknown Company',
    daysAvailable: doc.kit.schedule?.days_available ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Validates that a string is a syntactically valid MongoDB ObjectId.
 * Returns false for malformed IDs before hitting the database.
 */
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

// ---------------------------------------------------------------------------
// Save a new kit
// ---------------------------------------------------------------------------

/**
 * Persists a validated Appendix A kit for the authenticated user.
 * userId is derived from req.user.sub (the verified JWT subject).
 */
export async function saveKit(
  userId: string,
  kit: Kit
): Promise<KitServiceResult<{ id: string; kit: Kit; createdAt: string; updatedAt: string }>> {
  try {
    const doc = await KitDocumentModel.create({
      userId: new Types.ObjectId(userId),
      kit,
    });

    return {
      success: true,
      data: {
        id: String(doc._id),
        kit: doc.kit,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    throw err; // Let unexpected errors propagate to the route handler
  }
}

// ---------------------------------------------------------------------------
// List user's kits
// ---------------------------------------------------------------------------

/**
 * Returns a lightweight summary list of all kits belonging to the user.
 * Never returns full kit payloads to keep list responses fast.
 */
export async function listKits(userId: string): Promise<KitServiceResult<KitSummary[]>> {
  const docs = await KitDocumentModel
    .find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();

  const summaries: KitSummary[] = docs.map((doc) =>
    toKitSummary({
      _id: doc._id,
      kit: doc.kit as Kit,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    })
  );

  return { success: true, data: summaries };
}

// ---------------------------------------------------------------------------
// Get one kit by ID (ownership enforced)
// ---------------------------------------------------------------------------

/**
 * Shape returned for a single kit fetch, including optional M10 persistence
 * metadata stored outside the Appendix A payload.
 *
 * These three fields are omitted (undefined) when they have never been set,
 * so clients must treat them as optional.
 */
export interface KitFetchData {
  id: string;
  kit: Kit;
  createdAt: string;
  updatedAt: string;
  /** Maps question ID → confidence level. Absent when no confidence has been set. */
  questionConfidence?: Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>;
  /** Ordered array of question IDs. Absent when no custom order has been set. */
  questionOrder?: string[];
  /** Maps flashcard ID → confidence tier. Absent when no confidence has been set. */
  flashcardConfidence?: Record<string, 'easy' | 'medium' | 'hard'>;
}

/**
 * Fetches a single kit, scoped to the authenticated user.
 * Returns NOT_FOUND for both missing and non-owned kits to avoid
 * disclosing that a kit exists but belongs to another user.
 *
 * The response includes the M10 persistence metadata
 * (questionConfidence, questionOrder, flashcardConfidence) so the
 * frontend can restore interactive state when re-opening a saved kit.
 */
export async function getKitById(
  userId: string,
  kitId: string
): Promise<KitServiceResult<KitFetchData>> {
  if (!isValidObjectId(kitId)) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  const doc = await KitDocumentModel.findOne({
    _id: new Types.ObjectId(kitId),
    userId: new Types.ObjectId(userId),
  });

  if (!doc) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  // ---------------------------------------------------------------------------
  // Convert Mongoose Map objects to plain Records for JSON serialisation.
  // Mongoose stores Map-type fields as ES6 Map instances; JSON.stringify does
  // not serialise Map natively, so we convert to plain objects here.
  // ---------------------------------------------------------------------------
  const questionConfidence = doc.questionConfidence
    ? Object.fromEntries(
        doc.questionConfidence instanceof Map
          ? doc.questionConfidence
          : Object.entries(doc.questionConfidence)
      ) as Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>
    : undefined;

  const flashcardConfidence = doc.flashcardConfidence
    ? Object.fromEntries(
        doc.flashcardConfidence instanceof Map
          ? doc.flashcardConfidence
          : Object.entries(doc.flashcardConfidence)
      ) as Record<string, 'easy' | 'medium' | 'hard'>
    : undefined;

  const questionOrder =
    doc.questionOrder && doc.questionOrder.length > 0
      ? [...doc.questionOrder]
      : undefined;

  const data: KitFetchData = {
    id: String(doc._id),
    kit: doc.kit,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  if (questionConfidence !== undefined) data.questionConfidence = questionConfidence;
  if (questionOrder !== undefined) data.questionOrder = questionOrder;
  if (flashcardConfidence !== undefined) data.flashcardConfidence = flashcardConfidence;

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// Update a kit (ownership enforced, owner cannot be changed)
// ---------------------------------------------------------------------------

/**
 * Replaces the kit payload on an owned document.
 *
 * The userId is always taken from the JWT — the update never accepts a
 * new userId from the client, preventing ownership hijacking.
 */
export async function updateKit(
  userId: string,
  kitId: string,
  updatedKit: Kit
): Promise<KitServiceResult<{ id: string; kit: Kit; createdAt: string; updatedAt: string }>> {
  if (!isValidObjectId(kitId)) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  // findOneAndUpdate with { userId, _id } ensures ownership without a separate
  // read-then-write. new: true returns the updated document.
  const doc = await KitDocumentModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(kitId),
      userId: new Types.ObjectId(userId), // ownership guard — never updatable
    },
    {
      $set: { kit: updatedKit },
    },
    { new: true, runValidators: false } // Zod already validated the payload
  );

  if (!doc) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  return {
    success: true,
    data: {
      id: String(doc._id),
      kit: doc.kit,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Delete a kit (ownership enforced)
// ---------------------------------------------------------------------------

/**
 * Deletes an owned kit document.
 * Returns NOT_FOUND for missing or non-owned kits.
 */
export async function deleteKit(
  userId: string,
  kitId: string
): Promise<KitServiceResult<{ deleted: true }>> {
  if (!isValidObjectId(kitId)) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  const result = await KitDocumentModel.deleteOne({
    _id: new Types.ObjectId(kitId),
    userId: new Types.ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  return { success: true, data: { deleted: true } };
}

// ---------------------------------------------------------------------------
// Update question confidence (ownership enforced)
// ---------------------------------------------------------------------------

/**
 * Updates the confidence level for a specific question within a kit.
 * Confidence is stored outside the Appendix A kit payload to preserve schema compliance.
 * Only the owning user can update confidence for their own kit's questions.
 */
export async function updateQuestionConfidence(
  userId: string,
  kitId: string,
  questionId: string,
  confidence: QuestionConfidence
): Promise<KitServiceResult<{ updated: true }>> {
  if (!isValidObjectId(kitId)) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  // Validate confidence value
  if (!QuestionConfidenceEnum.includes(confidence)) {
    return {
      success: false,
      code: 'INVALID_CONFIDENCE',
      message: 'Invalid confidence value. Must be one of: unknown, not-ready, somewhat-ready, ready.',
      statusCode: 400,
    };
  }

  // Verify ownership and update confidence using atomic operation
  const result = await KitDocumentModel.updateOne(
    {
      _id: new Types.ObjectId(kitId),
      userId: new Types.ObjectId(userId),
    },
    {
      $set: { [`questionConfidence.${questionId}`]: confidence },
    }
  );

  if (result.matchedCount === 0) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  return { success: true, data: { updated: true } };
}

// ---------------------------------------------------------------------------
// Reorder questions (ownership enforced)
// ---------------------------------------------------------------------------

/**
 * Reorders questions within a kit by setting an explicit ordered array of question IDs.
 * Order is stored outside the Appendix A kit payload to preserve schema compliance.
 * Only the owning user can reorder their own kit's questions.
 */
export async function reorderQuestions(
  userId: string,
  kitId: string,
  questionIds: string[]
): Promise<KitServiceResult<{ updated: true }>> {
  if (!isValidObjectId(kitId)) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  // Validate: non-empty array
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return {
      success: false,
      code: 'INVALID_ORDER',
      message: 'Question order must be a non-empty array.',
      statusCode: 400,
    };
  }

  // Validate: no duplicates
  const uniqueIds = new Set(questionIds);
  if (uniqueIds.size !== questionIds.length) {
    return {
      success: false,
      code: 'INVALID_ORDER',
      message: 'Question order cannot contain duplicate IDs.',
      statusCode: 400,
    };
  }

  // Verify ownership and update order using atomic operation
  const result = await KitDocumentModel.updateOne(
    {
      _id: new Types.ObjectId(kitId),
      userId: new Types.ObjectId(userId),
    },
    {
      $set: { questionOrder: questionIds },
    }
  );

  if (result.matchedCount === 0) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  return { success: true, data: { updated: true } };
}

// ---------------------------------------------------------------------------
// Update flashcard confidence (ownership enforced)
// ---------------------------------------------------------------------------

/**
 * Updates the confidence tier for a specific flashcard within a kit.
 * Confidence is stored outside the Appendix A kit payload to preserve schema compliance.
 * Only the owning user can update confidence for their own kit's flashcards.
 *
 * @param userId  - JWT subject (authenticated user's MongoDB _id string)
 * @param kitId   - The kit document _id
 * @param flashcardId - The flashcard's id within the Appendix A payload
 * @param confidence  - One of: 'easy' | 'medium' | 'hard'
 */
export async function updateFlashcardConfidence(
  userId: string,
  kitId: string,
  flashcardId: string,
  confidence: FlashcardConfidence
): Promise<KitServiceResult<{ updated: true }>> {
  if (!isValidObjectId(kitId)) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  // Validate confidence value
  if (!FlashcardConfidenceEnum.includes(confidence)) {
    return {
      success: false,
      code: 'INVALID_CONFIDENCE',
      message: 'Invalid confidence value. Must be one of: easy, medium, hard.',
      statusCode: 400,
    };
  }

  // Verify the kit exists and is owned by this user, then fetch to validate flashcardId
  const doc = await KitDocumentModel.findOne({
    _id: new Types.ObjectId(kitId),
    userId: new Types.ObjectId(userId),
  });

  if (!doc) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Kit not found.',
      statusCode: 404,
    };
  }

  // Validate that the flashcard ID exists in the kit payload
  const flashcardExists = doc.kit.flashcards.some((f) => f.id === flashcardId);
  if (!flashcardExists) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Flashcard not found in this kit.',
      statusCode: 404,
    };
  }

  // Atomic update — ownership already confirmed above
  await KitDocumentModel.updateOne(
    {
      _id: new Types.ObjectId(kitId),
      userId: new Types.ObjectId(userId),
    },
    {
      $set: { [`flashcardConfidence.${flashcardId}`]: confidence },
    }
  );

  return { success: true, data: { updated: true } };
}
