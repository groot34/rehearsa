import { randomUUID } from 'crypto';
import { Kit } from '@rehearsa/shared';
import { SessionDocumentModel, ISessionDocument } from './session.model';
import { saveKit } from '../kits/kit.service';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface SessionServiceSuccess<T> {
  success: true;
  data: T;
}

export interface SessionServiceFailure {
  success: false;
  code: string;
  message: string;
  statusCode: number;
}

export type SessionServiceResult<T> = SessionServiceSuccess<T> | SessionServiceFailure;

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
 * Shape returned for a session fetch, including optional persistence
 * metadata stored outside the Appendix A payload.
 */
export interface SessionFetchData {
  sessionId: string;
  kit: Kit;
  createdAt: string;
  lastAccessedAt: string;
  /** Maps question ID → confidence level. Absent when no confidence has been set. */
  questionConfidence?: Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>;
  /** Ordered array of question IDs. Absent when no custom order has been set. */
  questionOrder?: string[];
  /** Maps flashcard ID → confidence tier. Absent when no confidence has been set. */
  flashcardConfidence?: Record<string, 'easy' | 'medium' | 'hard'>;
}

/**
 * Shape returned for session creation, including the session token for cookie binding.
 */
export interface SessionCreateData {
  sessionId: string;
  sessionToken: string;
  kit: Kit;
  createdAt: string;
  lastAccessedAt: string;
}

// ---------------------------------------------------------------------------
// Create a new session
// ---------------------------------------------------------------------------

/**
 * Creates a new generation session with a high-entropy opaque session ID.
 * Generates a session token for ownership verification (bound to HttpOnly cookie).
 * Sessions are anonymous (no userId) and have a 7-day TTL.
 */
export async function createSession(
  kit: Kit
): Promise<SessionServiceResult<SessionCreateData>> {
  try {
    const sessionId = randomUUID();
    const sessionToken = randomUUID();
    const now = new Date();

    const doc = await SessionDocumentModel.create({
      sessionId,
      sessionToken,
      kit,
      lastAccessedAt: now,
    });

    return {
      success: true,
      data: {
        sessionId: doc.sessionId,
        sessionToken: doc.sessionToken,
        kit: doc.kit,
        createdAt: doc.createdAt.toISOString(),
        lastAccessedAt: doc.lastAccessedAt.toISOString(),
      },
    };
  } catch (err) {
    // Handle duplicate sessionId (extremely unlikely with UUID v4)
    if (err instanceof Error && err.message.includes('duplicate key')) {
      return {
        success: false,
        code: 'SESSION_ID_CONFLICT',
        message: 'Session ID conflict. Please try again.',
        statusCode: 500,
      };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Get a session by ID
// ---------------------------------------------------------------------------

/**
 * Fetches a session by its opaque session ID and verifies ownership via session token.
 * Updates lastAccessedAt for TTL tracking.
 * Returns NOT_FOUND for missing sessions or invalid tokens (no ownership disclosure).
 */
export async function getSessionById(
  sessionId: string,
  sessionToken?: string
): Promise<SessionServiceResult<SessionFetchData>> {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Verify session token if provided (required for security)
  if (!sessionToken || typeof sessionToken !== 'string') {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Session token required.',
      statusCode: 401,
    };
  }

  const doc = await SessionDocumentModel.findOneAndUpdate(
    { sessionId, sessionToken },
    { $set: { lastAccessedAt: new Date() } },
    { new: true }
  );

  if (!doc) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // ---------------------------------------------------------------------------
  // Convert Mongoose Map objects to plain Records for JSON serialisation.
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

  const data: SessionFetchData = {
    sessionId: doc.sessionId,
    kit: doc.kit,
    createdAt: doc.createdAt.toISOString(),
    lastAccessedAt: doc.lastAccessedAt.toISOString(),
  };

  if (questionConfidence !== undefined) data.questionConfidence = questionConfidence;
  if (questionOrder !== undefined) data.questionOrder = questionOrder;
  if (flashcardConfidence !== undefined) data.flashcardConfidence = flashcardConfidence;

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// Convert session to saved kit
// ---------------------------------------------------------------------------

/**
 * Converts an anonymous session to a user-owned saved kit.
 * After successful conversion, the session is deleted.
 */
export async function convertSessionToKit(
  sessionId: string,
  userId: string
): Promise<SessionServiceResult<{ id: string; kit: Kit; createdAt: string; updatedAt: string }>> {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Fetch the session
  const sessionDoc = await SessionDocumentModel.findOne({ sessionId });

  if (!sessionDoc) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Save as a user-owned kit
  const saveResult = await saveKit(userId, sessionDoc.kit);

  if (!saveResult.success) {
    return {
      success: false,
      code: 'SAVE_FAILED',
      message: 'Failed to save kit.',
      statusCode: 500,
    };
  }

  // Delete the session after successful conversion
  await SessionDocumentModel.deleteOne({ sessionId });

  return {
    success: true,
    data: saveResult.data,
  };
}

// ---------------------------------------------------------------------------
// Update session confidence
// ---------------------------------------------------------------------------

/**
 * Updates the confidence level for a specific question within a session.
 * Confidence is stored outside the Appendix A kit payload to preserve schema compliance.
 * Requires session token for ownership verification.
 */
export async function updateSessionQuestionConfidence(
  sessionId: string,
  sessionToken: string,
  questionId: string,
  confidence: QuestionConfidence
): Promise<SessionServiceResult<{ updated: true }>> {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Verify session token
  if (!sessionToken || typeof sessionToken !== 'string') {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Session token required.',
      statusCode: 401,
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

  // Update confidence and lastAccessedAt with token verification
  const result = await SessionDocumentModel.updateOne(
    { sessionId, sessionToken },
    {
      $set: {
        [`questionConfidence.${questionId}`]: confidence,
        lastAccessedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  return { success: true, data: { updated: true } };
}

// ---------------------------------------------------------------------------
// Reorder session questions
// ---------------------------------------------------------------------------

/**
 * Reorders questions within a session by setting an explicit ordered array of question IDs.
 * Order is stored outside the Appendix A kit payload to preserve schema compliance.
 * Requires session token for ownership verification.
 */
export async function reorderSessionQuestions(
  sessionId: string,
  sessionToken: string,
  questionIds: string[]
): Promise<SessionServiceResult<{ updated: true }>> {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Verify session token
  if (!sessionToken || typeof sessionToken !== 'string') {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Session token required.',
      statusCode: 401,
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

  // Update order and lastAccessedAt with token verification
  const result = await SessionDocumentModel.updateOne(
    { sessionId, sessionToken },
    {
      $set: {
        questionOrder: questionIds,
        lastAccessedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  return { success: true, data: { updated: true } };
}

// ---------------------------------------------------------------------------
// Update session flashcard confidence
// ---------------------------------------------------------------------------

/**
 * Updates the confidence tier for a specific flashcard within a session.
 * Confidence is stored outside the Appendix A kit payload to preserve schema compliance.
 * Requires session token for ownership verification.
 */
export async function updateSessionFlashcardConfidence(
  sessionId: string,
  sessionToken: string,
  flashcardId: string,
  confidence: FlashcardConfidence
): Promise<SessionServiceResult<{ updated: true }>> {
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Verify session token
  if (!sessionToken || typeof sessionToken !== 'string') {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Session token required.',
      statusCode: 401,
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

  // Verify the session exists and validate flashcardId
  const doc = await SessionDocumentModel.findOne({ sessionId, sessionToken });

  if (!doc) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Session not found.',
      statusCode: 404,
    };
  }

  // Validate that the flashcard ID exists in the kit payload
  const flashcardExists = doc.kit.flashcards.some((f) => f.id === flashcardId);
  if (!flashcardExists) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Flashcard not found in this session.',
      statusCode: 404,
    };
  }

  // Atomic update
  await SessionDocumentModel.updateOne(
    { sessionId, sessionToken },
    {
      $set: {
        [`flashcardConfidence.${flashcardId}`]: confidence,
        lastAccessedAt: new Date(),
      },
    }
  );

  return { success: true, data: { updated: true } };
}
